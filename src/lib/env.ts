import type { DialPolicy } from "./phone";
import type { Limits } from "./authorize";

const list = (v: string | undefined, d: string) =>
  (v ?? d).split(",").map((s) => s.trim()).filter(Boolean);

export const isDemo = () => (process.env.DEMO_MODE ?? "true") !== "false";

export function dialPolicy(): DialPolicy {
  return {
    allowedCountryCodes: list(process.env.ALLOWED_COUNTRY_CODES, "20"),
    blockedPrefixes: list(process.env.BLOCKED_PREFIXES, "+20900,+44870,+44871,+44872,+449"),
    defaultCountry: process.env.DEFAULT_COUNTRY || "EG",
  };
}

export const callsPerMinute = () => Number(process.env.CALLS_PER_MINUTE || 5);
export const ratePerMinute = () => Number(process.env.PROVIDER_RATE_PER_MINUTE || 0.02);

export function defaultLimits(): Omit<Limits, "callsPerMinute"> {
  return { maxConcurrentCalls: 1, dailyMinuteLimit: 60, dailyCallLimit: 50 };
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}
