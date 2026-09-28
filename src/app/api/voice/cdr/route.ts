import { ingestCdr } from "@/lib/calls";
import { json, voiceAuthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Asterisk hangup handler → app. Accepts JSON or form-encoded. Idempotent on uniqueId. */
export async function POST(req: Request) {
  if (!voiceAuthorized(req)) return json({ error: "unauthorized" }, 401);
  const ct = req.headers.get("content-type") ?? "";
  const body = ct.includes("json")
    ? await req.json().catch(() => null)
    : Object.fromEntries(new URLSearchParams(await req.text()));
  const r = await ingestCdr(body);
  if (r.error) return json(r, 400);
  return json(r);
}
