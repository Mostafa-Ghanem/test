import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

export interface DialPolicy {
  /** Country calling codes without "+", e.g. ["20","44"]. "*" allows all. */
  allowedCountryCodes: string[];
  /** E.164 prefixes (with "+") that are always blocked, e.g. premium / service ranges. */
  blockedPrefixes: string[];
  defaultCountry: string;
}

export type DestinationCheck =
  | { ok: true; e164: string; countryCode: string }
  | { ok: false; reason: string };

const BLOCKED_TYPES = new Set(["PREMIUM_RATE", "SHARED_COST", "PERSONAL_NUMBER", "UAN", "VOICEMAIL"]);

/** Normalize user input to E.164 ("+201012345678"), or null if invalid. */
export function normalizeE164(input: string, defaultCountry = "EG"): string | null {
  const cleaned = String(input ?? "").replace(/[\s\-().]/g, "").replace(/^00/, "+");
  if (!/^\+?\d{3,16}$/.test(cleaned)) return null;
  const p = parsePhoneNumberFromString(cleaned, defaultCountry as CountryCode);
  if (!p || !p.isValid()) return null;
  return p.number;
}

export function checkDestination(input: string, policy: DialPolicy): DestinationCheck {
  const digits = String(input ?? "").replace(/\D/g, "");
  // Short codes = emergency / service numbers (112, 122, 911, 16xxx ...). Never routed.
  if (digits.length > 0 && digits.length <= 5) return { ok: false, reason: "service_number_blocked" };
  const e164 = normalizeE164(input, policy.defaultCountry);
  if (!e164) return { ok: false, reason: "invalid_number" };
  const p = parsePhoneNumberFromString(e164)!;
  const cc = p.countryCallingCode;
  if (!policy.allowedCountryCodes.includes("*") && !policy.allowedCountryCodes.includes(cc)) {
    return { ok: false, reason: "country_not_allowed" };
  }
  if (policy.blockedPrefixes.some((pre) => pre && e164.startsWith(pre))) {
    return { ok: false, reason: "destination_blocked" };
  }
  const type = p.getType();
  if (type && BLOCKED_TYPES.has(type)) return { ok: false, reason: "destination_blocked" };
  return { ok: true, e164, countryCode: cc };
}
