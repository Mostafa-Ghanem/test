import { guard, json } from "@/lib/http";
import { startCall } from "@/lib/calls";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.res) return g.res;
  const calls = await q(
    `SELECT id, destination, status, caller_identity_mode, demo, started_at, answered_at, ended_at, duration, billable_seconds
       FROM calls WHERE user_id = $1 ORDER BY started_at DESC LIMIT 50`,
    [g.user.id],
  );
  return json({ calls });
}

/** Server-side dialing authorization. Body: { destination, callerIdentity?: "private" } — nothing else accepted. */
export async function POST(req: Request) {
  const g = await guard(req, { mutation: true });
  if (g.res) return g.res;
  const r = await startCall(g.user, await req.json().catch(() => null));
  if (!r.ok) return json({ error: r.reason }, r.status);
  return json(r, 201);
}
