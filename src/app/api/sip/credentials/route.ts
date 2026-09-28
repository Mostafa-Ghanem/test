import { guard, json } from "@/lib/http";
import { isDemo } from "@/lib/env";
import { sipPassword, turnCredentials } from "@/lib/sip";

export const dynamic = "force-dynamic";

/**
 * Returns the caller's OWN WebRTC registration credentials (technically required by SIP.js).
 * Only the extension password — never upstream trunk credentials. Not available in demo mode.
 */
export async function POST(req: Request) {
  const g = await guard(req, { mutation: true });
  if (g.res) return g.res;
  if (isDemo()) return json({ demo: true });
  const u = g.user;
  if (!u.extension || !u.extensionEnabled) return json({ error: "no_extension" }, 403);
  const wss = process.env.VOICE_WSS_URL, domain = process.env.VOICE_SIP_DOMAIN;
  if (!wss || !domain) return json({ error: "voice_not_configured" }, 503);
  const turn = turnCredentials(u.extension);
  const stun = (process.env.STUN_URLS || "").split(",").filter(Boolean);
  return json(
    {
      wssUrl: wss,
      domain,
      extension: u.extension,
      password: sipPassword(u.extension),
      iceServers: [...(stun.length ? [{ urls: stun }] : []), ...(turn ? [turn] : [])],
    },
    200,
  );
}
