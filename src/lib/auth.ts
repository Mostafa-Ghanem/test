import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { q } from "./db";

export const SESSION_COOKIE = "pc_session";
const TTL_SECONDS = 60 * 60 * 12;

export interface SessionUser {
  id: string;
  email: string;
  role: "admin" | "user";
  enabled: boolean;
  extension: string | null;
  extensionEnabled: boolean;
}

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (>= 32 chars)");
  return new TextEncoder().encode(s);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(key());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Loads the user from DB on every request so disabling takes effect immediately. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    const rows = await q<{ id: string; email: string; role: "admin" | "user"; enabled: boolean; extension: string | null; ext_enabled: boolean | null }>(
      `SELECT u.id, u.email, u.role, u.enabled, s.extension, s.enabled AS ext_enabled
         FROM users u LEFT JOIN sip_extensions s ON s.user_id = u.id WHERE u.id = $1`,
      [payload.sub],
    );
    const u = rows[0];
    if (!u || !u.enabled) return null;
    return { id: u.id, email: u.email, role: u.role, enabled: u.enabled, extension: u.extension, extensionEnabled: !!u.ext_enabled };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/");
  return u;
}
