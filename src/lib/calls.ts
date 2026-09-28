import { randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { q, tx } from "./db";
import { authorizeDial, parseCallRequest, type UsageSnapshot } from "./authorize";
import { checkDestination } from "./phone";
import { callsPerMinute, dialPolicy, isDemo, maxCallSeconds, ratePerMinute } from "./env";
import { processCdr, type CdrStore, type FinalizeFields } from "./cdr";
import type { SessionUser } from "./auth";
import { formatDialNumber, loadProviderConfig, validateProviderConfig } from "@/providers";

export interface CallRow {
  id: string;
  user_id: string;
  destination: string;
  status: string;
  provider: string;
  caller_identity_mode: string;
  demo: boolean;
  started_at: Date;
  answered_at: Date | null;
  ended_at: Date | null;
  duration: number | null;
  billable_seconds: number;
  cost: string;
}

// A call counts as active unless ended, stale (>4h), or an unused expired real-mode dial token.
export const ACTIVE_SQL = `ended_at IS NULL AND started_at > now() - interval '4 hours'
  AND NOT (demo = false AND dial_token_used_at IS NULL AND dial_token_expires_at < now())`;

async function usage(c: PoolClient, userId: string): Promise<UsageSnapshot> {
  const r = await c.query(
    `SELECT count(*) FILTER (WHERE ${ACTIVE_SQL})::int AS active,
            count(*) FILTER (WHERE started_at >= date_trunc('day', now()))::int AS today,
            coalesce(sum(billable_seconds) FILTER (WHERE started_at >= date_trunc('day', now())), 0)::int AS secs,
            count(*) FILTER (WHERE started_at > now() - interval '1 minute')::int AS last_min
       FROM calls WHERE user_id = $1`,
    [userId],
  );
  const x = r.rows[0];
  return { activeCalls: x.active, callsToday: x.today, secondsToday: x.secs, callsLastMinute: x.last_min };
}

export type StartResult =
  | { ok: true; callId: string; demo: boolean; dialTarget?: string }
  | { ok: false; reason: string; status: number };

export async function startCall(user: SessionUser, body: unknown): Promise<StartResult> {
  const req = parseCallRequest(body);
  if (!req.ok) return { ok: false, reason: req.reason, status: 400 };
  const dest = checkDestination(req.destination, dialPolicy());
  const demo = isDemo();
  const provider = loadProviderConfig();
  if (!demo && !validateProviderConfig(provider).configured) return { ok: false, reason: "provider_not_configured", status: 503 };

  return tx(async (c) => {
    // Serialize per user so concurrent-call limits can't be raced.
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [user.id]);
    const lim = (await c.query("SELECT * FROM usage_limits WHERE user_id = $1", [user.id])).rows[0] ?? {};
    const res = authorizeDial(user, await usage(c, user.id), {
      maxConcurrentCalls: lim.max_concurrent_calls ?? 1,
      dailyMinuteLimit: lim.daily_minute_limit ?? 60,
      dailyCallLimit: lim.daily_call_limit ?? 50,
      callsPerMinute: callsPerMinute(),
    }, dest);
    if (!res.ok || !dest.ok) return { ok: false as const, reason: res.ok ? "invalid_number" : res.reason, status: res.ok ? 422 : res.status };
    const token = demo ? null : randomBytes(16).toString("hex");
    const row = (
      await c.query(
        `INSERT INTO calls (user_id, destination, provider, caller_identity_mode, demo, dial_token, dial_token_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $6::text IS NULL THEN NULL ELSE now() + interval '60 seconds' END) RETURNING id`,
        [user.id, dest.e164, demo ? "demo" : provider!.provider, req.identityMode, demo, token],
      )
    ).rows[0];
    await c.query(
      `INSERT INTO call_events (call_id, idempotency_key, type, payload) VALUES ($1, $2, 'initiated', $3)`,
      [row.id, `init:${row.id}`, { destination: dest.e164, demo }],
    );
    // Browser dials an opaque one-time token; Asterisk resolves it server-side.
    return { ok: true as const, callId: row.id, demo, dialTarget: token ? `pc${token}` : undefined };
  });
}

export const pgCdrStore: CdrStore = {
  async insertEventOnce(key, callId, type, payload) {
    const r = await q(
      `INSERT INTO call_events (call_id, idempotency_key, type, payload)
       SELECT $1, $2, $3, $4 WHERE EXISTS (SELECT 1 FROM calls WHERE id = $1)
       ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`,
      [callId, key, type, JSON.stringify(payload)],
    );
    return r.length > 0;
  },
  async finalizeCall(callId, f: FinalizeFields) {
    await q(
      `UPDATE calls SET status = $2, answered_at = coalesce(answered_at, $3), ended_at = $4,
              duration = $5, billable_seconds = $6, cost = $7
        WHERE id = $1 AND ended_at IS NULL`,
      [callId, f.status, f.answeredAt, f.endedAt, f.duration, f.billableSeconds, f.cost],
    );
  },
};

export const ingestCdr = (payload: unknown) => processCdr(pgCdrStore, payload, ratePerMinute());

export async function getCall(id: string, userId?: string): Promise<CallRow | null> {
  const rows = await q<CallRow>(
    `SELECT * FROM calls WHERE id = $1 ${userId ? "AND user_id = $2" : ""}`,
    userId ? [id, userId] : [id],
  );
  return rows[0] ?? null;
}

/**
 * DEMO_MODE simulation — no network/PSTN activity. Status advances by elapsed time:
 * ringing after 1s, answered after 4s. Numbers ending 0000 → busy, 9999 → no answer.
 */
export async function advanceDemo(call: CallRow): Promise<CallRow> {
  if (!call.demo || call.ended_at) return call;
  const el = (Date.now() - new Date(call.started_at).getTime()) / 1000;
  const start = Math.floor(new Date(call.started_at).getTime() / 1000);
  if (call.destination.endsWith("0000") && el > 3) {
    await ingestCdr({ callId: call.id, uniqueId: `demo-${call.id}`, disposition: "BUSY", start, end: start + 3 });
  } else if (call.destination.endsWith("9999") && el > 10) {
    await ingestCdr({ callId: call.id, uniqueId: `demo-${call.id}`, disposition: "NOANSWER", start, end: start + 10, duration: 10 });
  } else if (el > 600) {
    await hangupDemo(call);
  } else {
    const ringOnly = /(0000|9999)$/.test(call.destination);
    const next = el > 4 && !ringOnly ? "answered" : el > 1 ? "ringing" : "initiated";
    if (next !== call.status) {
      await q(
        `UPDATE calls SET status = $2, answered_at = CASE WHEN $2 = 'answered' THEN started_at + interval '4 seconds' ELSE answered_at END
          WHERE id = $1 AND ended_at IS NULL`,
        [call.id, next],
      );
    }
  }
  return (await getCall(call.id))!;
}

export async function hangupDemo(call: CallRow) {
  const start = Math.floor(new Date(call.started_at).getTime() / 1000);
  const answer = call.answered_at ? Math.floor(new Date(call.answered_at).getTime() / 1000) : 0;
  const end = Math.floor(Date.now() / 1000);
  await ingestCdr({
    callId: call.id,
    uniqueId: `demo-${call.id}`,
    disposition: answer ? "ANSWER" : "CANCEL",
    start,
    answer: answer || "",
    end,
    duration: end - start,
    billsec: answer ? end - answer : 0,
  });
}

/**
 * Called by Asterisk dialplan with the one-time token the browser dialed.
 * Returns a pipe-delimited line: OK|callId|dialNumber|privacy|fromNumber|maxSeconds  or  DENY|reason
 */
export async function voiceAuthorize(token: string, endpoint: string): Promise<string> {
  if (!/^[a-f0-9]{32}$/.test(token) || !/^\d{3,8}$/.test(endpoint)) return "DENY|bad_request";
  const cfg = loadProviderConfig();
  if (!validateProviderConfig(cfg).configured || !cfg) return "DENY|provider_not_configured";
  const rows = await q<{ id: string; destination: string; caller_identity_mode: string }>(
    `UPDATE calls c SET dial_token_used_at = now(), status = 'ringing'
       FROM sip_extensions s, users u
      WHERE c.dial_token = $1 AND c.dial_token_used_at IS NULL AND c.dial_token_expires_at > now()
        AND s.user_id = c.user_id AND s.extension = $2 AND s.enabled AND u.id = c.user_id AND u.enabled
      RETURNING c.id, c.destination, c.caller_identity_mode`,
    [token, endpoint],
  );
  const call = rows[0];
  if (!call) return "DENY|not_authorized";
  // Cap the call length so an answered call cannot run past the user's daily minute limit.
  const [u] = await q<{ remaining: number }>(
    `SELECT coalesce(l.daily_minute_limit, 60) * 60 - coalesce(sum(c.billable_seconds), 0)::int AS remaining
       FROM calls me JOIN usage_limits l ON l.user_id = me.user_id
       LEFT JOIN calls c ON c.user_id = me.user_id AND c.started_at >= date_trunc('day', now())
      WHERE me.id = $1 GROUP BY l.daily_minute_limit`,
    [call.id],
  );
  const maxSeconds = Math.min(u?.remaining ?? 0, maxCallSeconds());
  if (maxSeconds <= 0) return "DENY|daily_minute_limit";
  // Identity is decided here, server-side. Only "private" exists today.
  const privacy = call.caller_identity_mode === "private" && cfg.privacyEnabled ? "1" : "0";
  if (privacy !== "1") return "DENY|privacy_required";
  return ["OK", call.id, formatDialNumber(call.destination, cfg), privacy, cfg.fromNumber.replace(/^\+/, ""), maxSeconds].join("|");
}
