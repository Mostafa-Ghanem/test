import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";
import { q, tx } from "./db";

export async function createUser(email: string, password: string, role: "admin" | "user", c?: PoolClient) {
  const hash = await bcrypt.hash(password, 12);
  const run = async (cl: PoolClient) => {
    const u = (await cl.query("INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id", [email.toLowerCase(), hash, role])).rows[0];
    await cl.query("INSERT INTO sip_extensions (user_id) VALUES ($1)", [u.id]);
    await cl.query("INSERT INTO usage_limits (user_id) VALUES ($1)", [u.id]);
    return u.id as string;
  };
  return c ? run(c) : tx(run);
}

// Constant-ish time: always run bcrypt even for unknown emails.
let dummy: string | undefined;

export async function verifyLogin(email: string, password: string) {
  const DUMMY = (dummy ??= await bcrypt.hash("dummy-password", 12));
  const u = (await q<{ id: string; password_hash: string; enabled: boolean }>(
    "SELECT id, password_hash, enabled FROM users WHERE email = $1", [email.toLowerCase()],
  ))[0];
  const ok = await bcrypt.compare(password, u?.password_hash ?? DUMMY);
  return ok && u?.enabled ? u.id : null;
}

export async function audit(actorId: string | null, action: string, target: string, details: unknown = {}) {
  await q("INSERT INTO audit_log (actor_id, action, target, details) VALUES ($1, $2, $3, $4)", [actorId, action, target, JSON.stringify(details)]);
}
