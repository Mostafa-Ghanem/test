# PrivateCall

Web/PWA calling platform. Authenticated users place VoIP calls to the PSTN with **legitimate caller-ID privacy (CLIR)**.
The recipient sees **Private / Anonymous**. The upstream carrier still gets the real, account-owned identity in
`P-Asserted-Identity` with `Privacy: id` (RFC 3325).

> There is no caller-ID spoofing. Users cannot type or pick a caller ID, and no API accepts one.
> `POST /api/calls` accepts only `{ destination, callerIdentity?: "private" }`. The schema is strict, so any other field is rejected.
> The identity number (`SIP_FROM_NUMBER`) comes only from server config. Asterisk ignores identity from the browser (`trust_id_inbound=no`).

## Architecture

```
Browser/PWA (Next.js on Vercel)            Voice VM (Ubuntu / Oracle Free Tier)
 ├─ UI, auth, admin, limits, CDR DB  ◄──►  Asterisk (PJSIP, WSS :8089, DTLS-SRTP, ICE) ──► provider-trunk ──► PSTN
 └─ SIP.js ── WSS + DTLS-SRTP ─────────►   coturn (STUN/TURN :3478/:5349)
```

Call flow (live mode):
1. Browser `POST /api/calls {destination}`. The server authenticates, normalizes the number to E.164, applies the allow-list, blocked ranges and limits, then creates a `calls` row with a **one-time 60 s dial token**.
2. SIP.js dials `sip:pc<token>@voice-domain` over WSS.
3. Asterisk `[from-webrtc]` calls `GET /api/voice/authorize?token=&endpoint=` using the shared secret. The app checks that the token belongs to that extension and returns `OK|callId|dialNumber|privacy|fromNumber`.
4. Asterisk sets `CALLERID(pres)=prohib` and runs `Dial(PJSIP/<dialNumber>@provider-trunk)`.
5. The hangup handler POSTs the CDR to `/api/voice/cdr`. It is idempotent on `UNIQUEID` (`call_events.idempotency_key` UNIQUE).

### Provider-independent by design
Asterisk always dials the endpoint **`provider-trunk`**, whatever the provider. The provider section
(`pjsip_provider.conf`) is **generated** from `SIP_*` env vars by `src/providers/*`. The voice VM pulls it every minute
(`/api/voice/config`, secret-protected). Switching Localphone to Telnyx or another carrier only means changing env vars.
You don't need to touch Asterisk configs, the dialplan or the UI.

```
src/providers/
  localphone/   defaults: sip.localphone.com:5060 udp, dial format "digits"
  telnyx/       defaults: sip.telnyx.com:5060 udp, dial format "e164"
  generic-sip/  everything from env
  index.ts      loadProviderConfig / validateProviderConfig / formatDialNumber / renderTrunkPjsip
```

## Local setup

```bash
cp .env.example .env          # optional: docker compose has dev defaults
docker compose up             # postgres + app (runs migrations + seeds admin) + asterisk + coturn
# open http://localhost:3000   login: admin@example.com / admin12345!
```

Without Docker (you need your own PostgreSQL):
```bash
npm install
cp .env.example .env          # set DATABASE_URL, SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db:migrate            # applies db/migrations/*.sql + seeds first admin
npm run dev
```

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## DEMO_MODE
`DEMO_MODE=true` (the default) never touches Asterisk or a provider, and the UI clearly says **“Demo mode — simulated calls”**.
- Calls go through the **same** authorization: auth, E.164, allow-list, blocked ranges, concurrent, daily and per-minute limits.
- Status moves from initiated to ringing (1 s) to answered (4 s). Hanging up finalizes the call through the **same CDR pipeline** (`processCdr`, idempotent).
- Numbers ending in `0000` return **busy** and numbers ending in `9999` return **no answer**.
- Rows are stored with `provider=demo`, `demo=true` and cost 0. They are never presented as real PSTN calls.

To go live, set `DEMO_MODE=false` and the `SIP_*` and `VOICE_*` variables. The code path doesn't change.

## Environment variables
See `.env.example`. Key groups:

| Var | Where | Purpose |
|---|---|---|
| `DATABASE_URL`, `SESSION_SECRET` (≥32 chars) | app | DB and signed session cookie |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | app (migrate) | first admin seed |
| `DEMO_MODE` | app | `true` = simulation |
| `ALLOWED_COUNTRY_CODES` (`20,44` or `*`), `BLOCKED_PREFIXES`, `DEFAULT_COUNTRY`, `CALLS_PER_MINUTE` | app | abuse protection |
| `VOICE_WSS_URL`, `VOICE_SIP_DOMAIN`, `VOICE_HEALTH_URL` | app | voice server location |
| `VOICE_SHARED_SECRET` | app + VM | Asterisk ↔ app auth |
| `SIP_EXTENSION_SECRET` | app | derives per-user WebRTC SIP passwords (HMAC, never stored) |
| `TURN_SECRET`, `TURN_URLS`, `STUN_URLS` | app + coturn | ephemeral TURN credentials |
| `SIP_PROVIDER`, `SIP_HOST`, `SIP_PORT`, `SIP_TRANSPORT`, `SIP_USERNAME`, `SIP_PASSWORD`, `SIP_FROM_NUMBER`, `SIP_PRIVACY_ENABLED`, `SIP_DIAL_FORMAT`, `SIP_DIAL_PREFIX`, `SIP_REGISTER` | app | upstream trunk |

The upstream SIP password is kept only in env. It never goes into the DB and is never returned by any public API.
The only SIP secret a browser ever gets is **its own extension password**, from `POST /api/sip/credentials`. It needs an authenticated session, and SIP.js registration can't work without it.

## Vercel deployment
1. Import the repo in Vercel (framework: Next.js, no `vercel.json` needed).
2. Create a Postgres database (Neon, Supabase or Vercel Postgres) and set `DATABASE_URL`.
3. Set the env vars from `.env.example`. Generate secrets with `openssl rand -base64 48`.
4. Run migrations once from your machine: `DATABASE_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:migrate`.
5. Check `https://<app>/api/health`.

## Voice VM deployment (Oracle Cloud / Ubuntu)
1. Create an Ubuntu 22.04/24.04 VM with a public IP.
2. In the OCI Security List, allow TCP 80, 443, 5061, 8089, 3478, 5349 and UDP 5060, 3478, 10000-20000, 49160-49200.
3. Set up DNS: `A voice.example.com → VM public IP`.
4. On the VM:
   ```bash
   git clone <repo> && cd privatecall
   sudo VOICE_DOMAIN=voice.example.com ACME_EMAIL=you@example.com \
        PRIVATECALL_APP_URL=https://<app>.vercel.app \
        VOICE_SHARED_SECRET=<same as app> TURN_SECRET=<same as app> \
        bash infra/oracle-vm/setup-voice-server.sh
   ```
   The script installs Asterisk, coturn and certbot, and configures ufw and Oracle's iptables. It then issues a Let's Encrypt cert with a renewal hook, installs the configs and the minute-by-minute config sync, starts the services and validates them.

### DNS / TLS requirements
- `voice.<domain>` A record pointing to the VM. Port 80 must be reachable for the certbot HTTP-01 challenge.
- Browsers require **valid TLS** for WSS (`wss://voice.<domain>:8089/ws`). Self-signed certs only work locally after you accept the cert at `https://localhost:8089/httpstatus`.
- The app must be served over HTTPS so the microphone (getUserMedia) works. Vercel does this by default.

## Connecting Localphone later
Set these on Vercel:
```
DEMO_MODE=false
SIP_PROVIDER=localphone
SIP_USERNAME=<localphone sip username>
SIP_PASSWORD=<localphone sip password>
SIP_FROM_NUMBER=<your Localphone number, E.164>
SIP_PRIVACY_ENABLED=true
# optional overrides: SIP_HOST, SIP_PORT, SIP_DIAL_FORMAT, SIP_DIAL_PREFIX
```
Redeploy. Within about a minute the VM pulls the new `pjsip_provider.conf` and reloads PJSIP.
Check with `asterisk -rx "pjsip show registrations"`.

## Replacing Localphone with another provider
- Telnyx: `SIP_PROVIDER=telnyx`, then set the Telnyx credential-connection username/password and a Telnyx number as `SIP_FROM_NUMBER`.
- Any other trunk: `SIP_PROVIDER=generic-sip` plus `SIP_HOST`, `SIP_PORT`, `SIP_TRANSPORT`, `SIP_DIAL_FORMAT` and, if needed, `SIP_REGISTER=false` (IP-auth trunks).
- A carrier with special needs gets a new folder in `src/providers/<name>` that is registered in `ADAPTERS`.

Nothing in Asterisk or the UI changes. If a carrier doesn't show "Private" on some destination network, switch the env vars and redeploy.

## Testing WebRTC
1. With `DEMO_MODE=false` and no provider yet, open the app. The dialer should show **Connected ●** (SIP.js registered).
2. On the VM, `asterisk -rx "pjsip show contacts"` should show your extension.
3. A dial attempt without a provider is refused by the app (`provider_not_configured`). This is expected.
4. For ICE problems, use `chrome://webrtc-internals` and make sure TURN candidates (`relay`) appear.

## Testing a real PSTN call
1. Configure the provider (see above) and confirm `/admin/system` shows **SIP Provider: Configured**.
2. `asterisk -rx "pjsip show registrations"` should report *Registered*.
3. Call your own mobile. It should show **Private / No caller ID**.
4. Watch `asterisk -rvvv` and `pjsip set logger on` to verify `From: "Anonymous"`, `P-Asserted-Identity` and `Privacy: id`.
5. After hangup, the call appears in `/admin/calls` with duration and cost from the CDR.

## Health
`GET /api/health` returns `{ app, database, voiceServer, sipProvider, provider, demoMode }` with no secrets. `/admin/system` shows the same information.

## Troubleshooting
| Symptom | Check |
|---|---|
| Dialer shows *Disconnected* | `VOICE_WSS_URL` and a valid cert on :8089, port open in OCI and ufw, `pjsip show transports` |
| Registration 401 | Users are synced to the VM (`/etc/asterisk/pjsip_users.conf`) and `SIP_EXTENSION_SECRET` hasn't changed |
| Call connects but no audio | TURN (`TURN_SECRET` matches), RTP 10000-20000/udp open, `external_media_address` is the public IP |
| Call immediately rejected (cause 21) | `/api/voice/authorize` response in Asterisk log: token expired, wrong extension, or provider not configured |
| Recipient sees the number | The provider ignores RFC 3325 privacy. Try `SIP_DIAL_PREFIX` (a carrier CLIR prefix) or switch provider |
| CDR missing | VM can reach `PRIVATECALL_APP_URL` and `VOICE_SHARED_SECRET` matches on both sides |
