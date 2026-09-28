import { destroySession } from "@/lib/auth";
import { json, sameOrigin } from "@/lib/http";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "csrf" }, 403);
  await destroySession();
  return json({ ok: true });
}
