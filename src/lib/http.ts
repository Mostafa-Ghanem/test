import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSessionUser, type SessionUser } from "./auth";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

/** CSRF protection for cookie-authenticated mutations: require same-origin Origin header. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

type Guard = { user: SessionUser; res?: never } | { user?: never; res: NextResponse };

export async function guard(req: Request, opts: { admin?: boolean; mutation?: boolean } = {}): Promise<Guard> {
  if (opts.mutation && !sameOrigin(req)) return { res: json({ error: "csrf" }, 403) };
  const user = await getSessionUser();
  if (!user) return { res: json({ error: "unauthorized" }, 401) };
  if (opts.admin && user.role !== "admin") return { res: json({ error: "forbidden" }, 403) };
  return { user };
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Auth for Asterisk → app calls (shared secret header). */
export function voiceAuthorized(req: Request): boolean {
  const s = process.env.VOICE_SHARED_SECRET;
  const got = req.headers.get("x-voice-secret") ?? "";
  return !!s && s.length >= 16 && safeEqual(got, s);
}

const buckets = new Map<string, { n: number; reset: number }>();
/** Simple in-memory fixed-window limiter (per instance). DB-backed limits guard calls. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  return ++b.n <= max;
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
