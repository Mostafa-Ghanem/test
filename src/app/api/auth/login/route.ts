import { z } from "zod";
import { createSession } from "@/lib/auth";
import { clientIp, json, rateLimit, sameOrigin } from "@/lib/http";
import { verifyLogin } from "@/lib/users";

const schema = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "csrf" }, 403);
  if (!rateLimit(`login:${clientIp(req)}`, 10, 15 * 60_000)) return json({ error: "rate_limited" }, 429);
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: "invalid_request" }, 400);
  const id = await verifyLogin(body.data.email, body.data.password);
  if (!id) return json({ error: "invalid_credentials" }, 401);
  await createSession(id);
  return json({ ok: true });
}
