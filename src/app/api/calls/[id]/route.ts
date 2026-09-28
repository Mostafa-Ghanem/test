import { guard, json } from "@/lib/http";
import { advanceDemo, getCall, hangupDemo } from "@/lib/calls";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(req);
  if (g.res) return g.res;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return json({ error: "not_found" }, 404);
  const call = await getCall(id, g.user.id);
  if (!call) return json({ error: "not_found" }, 404);
  return json({ call: await advanceDemo(call) });
}

/** Hang up. Demo: finalizes via the same CDR pipeline. Real: the browser sends BYE; Asterisk posts the CDR. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(req, { mutation: true });
  if (g.res) return g.res;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return json({ error: "not_found" }, 404);
  const call = await getCall(id, g.user.id);
  if (!call) return json({ error: "not_found" }, 404);
  if (call.demo) await hangupDemo(call);
  return json({ call: await getCall(id) });
}
