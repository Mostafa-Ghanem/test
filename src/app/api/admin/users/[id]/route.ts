import { z } from "zod";
import { tx } from "@/lib/db";
import { guard, json } from "@/lib/http";
import { audit } from "@/lib/users";

const schema = z
  .object({
    enabled: z.boolean().optional(),
    maxConcurrentCalls: z.number().int().min(0).max(20).optional(),
    dailyMinuteLimit: z.number().int().min(0).max(10000).optional(),
    dailyCallLimit: z.number().int().min(0).max(10000).optional(),
  })
  .strict();

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(req, { admin: true, mutation: true });
  if (g.res) return g.res;
  const { id } = await ctx.params;
  const b = schema.safeParse(await req.json().catch(() => null));
  if (!b.success || !/^[0-9a-f-]{36}$/.test(id)) return json({ error: "invalid_request" }, 400);
  if (id === g.user.id && b.data.enabled === false) return json({ error: "cannot_disable_self" }, 400);
  const d = b.data;
  await tx(async (c) => {
    if (d.enabled !== undefined) {
      await c.query("UPDATE users SET enabled = $2 WHERE id = $1", [id, d.enabled]);
      await c.query("UPDATE sip_extensions SET enabled = $2 WHERE user_id = $1", [id, d.enabled]);
    }
    await c.query(
      `UPDATE usage_limits SET max_concurrent_calls = coalesce($2, max_concurrent_calls),
         daily_minute_limit = coalesce($3, daily_minute_limit), daily_call_limit = coalesce($4, daily_call_limit)
       WHERE user_id = $1`,
      [id, d.maxConcurrentCalls ?? null, d.dailyMinuteLimit ?? null, d.dailyCallLimit ?? null],
    );
  });
  await audit(g.user.id, "user.update", id, d);
  return json({ ok: true });
}
