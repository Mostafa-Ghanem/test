import { z } from "zod";
import type { DestinationCheck } from "./phone";

/**
 * The ONLY caller identity modes. There is no free-form caller ID anywhere.
 * "verified" (an account-owned, provider-verified number) is reserved for later.
 */
export const IDENTITY_MODES = ["private"] as const;
export type IdentityMode = (typeof IDENTITY_MODES)[number];

// .strict(): any extra field (callerId, from, pai, headers, trunk...) is rejected.
const callRequestSchema = z
  .object({
    destination: z.string().min(1).max(32),
    callerIdentity: z.enum(IDENTITY_MODES).optional().default("private"),
  })
  .strict();

export function parseCallRequest(
  body: unknown,
): { ok: true; destination: string; identityMode: IdentityMode } | { ok: false; reason: string } {
  const r = callRequestSchema.safeParse(body);
  if (!r.success) return { ok: false, reason: "invalid_request" };
  return { ok: true, destination: r.data.destination, identityMode: r.data.callerIdentity };
}

export interface UsageSnapshot {
  activeCalls: number;
  callsToday: number;
  secondsToday: number;
  callsLastMinute: number;
}

export interface Limits {
  maxConcurrentCalls: number;
  dailyMinuteLimit: number;
  dailyCallLimit: number;
  callsPerMinute: number;
}

export type AuthzResult = { ok: true } | { ok: false; reason: string; status: number };

export function authorizeDial(
  user: { enabled: boolean; extensionEnabled: boolean },
  usage: UsageSnapshot,
  limits: Limits,
  dest: DestinationCheck,
): AuthzResult {
  if (!user.enabled || !user.extensionEnabled) return { ok: false, reason: "user_disabled", status: 403 };
  if (!dest.ok) return { ok: false, reason: dest.reason, status: 422 };
  if (usage.callsLastMinute >= limits.callsPerMinute) return { ok: false, reason: "rate_limited", status: 429 };
  if (usage.activeCalls >= limits.maxConcurrentCalls) return { ok: false, reason: "concurrent_limit", status: 429 };
  if (usage.callsToday >= limits.dailyCallLimit) return { ok: false, reason: "daily_call_limit", status: 429 };
  if (usage.secondsToday >= limits.dailyMinuteLimit * 60) return { ok: false, reason: "daily_minute_limit", status: 429 };
  return { ok: true };
}
