import { z } from "zod";
import { guard, json } from "@/lib/http";
import { audit, createUser } from "@/lib/users";

const createSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(10).max(200),
  role: z.enum(["admin", "user"]).default("user"),
});

export async function POST(req: Request) {
  const g = await guard(req, { admin: true, mutation: true });
  if (g.res) return g.res;
  const b = createSchema.safeParse(await req.json().catch(() => null));
  if (!b.success) return json({ error: "invalid_request" }, 400);
  try {
    const id = await createUser(b.data.email, b.data.password, b.data.role);
    await audit(g.user.id, "user.create", id, { email: b.data.email, role: b.data.role });
    return json({ id }, 201);
  } catch {
    return json({ error: "email_exists" }, 409);
  }
}
