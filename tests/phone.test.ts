import { describe, expect, it } from "vitest";
import { checkDestination, normalizeE164 } from "@/lib/phone";

const policy = { allowedCountryCodes: ["20", "44"], blockedPrefixes: ["+20900"], defaultCountry: "EG" };

describe("E.164 normalization", () => {
  it.each([
    ["01012345678", "+201012345678"],
    ["+20 101 234 5678", "+201012345678"],
    ["00201012345678", "+201012345678"],
    ["(010) 1234-5678", "+201012345678"],
    ["+447911123456", "+447911123456"],
  ])("%s → %s", (i, o) => expect(normalizeE164(i)).toBe(o));

  it.each(["", "abc", "+20123", "01012345678;x", "+1 (555) <script>"])("rejects %s", (i) => expect(normalizeE164(i)).toBeNull());
});

describe("destination validation", () => {
  it("allows allow-listed countries", () => expect(checkDestination("01012345678", policy)).toMatchObject({ ok: true }));
  it("blocks non allow-listed countries", () =>
    expect(checkDestination("+16502530000", policy)).toEqual({ ok: false, reason: "country_not_allowed" }));
  it.each(["122", "123", "112", "911", "999", "16000"])("blocks emergency/service %s", (n) =>
    expect(checkDestination(n, policy)).toEqual({ ok: false, reason: "service_number_blocked" }));
  it("blocks configured prefixes", () =>
    expect(checkDestination("+44 1632 960000", { ...policy, blockedPrefixes: ["+441632"] })).toMatchObject({ ok: false }));
  it("wildcard allows all countries", () =>
    expect(checkDestination("+16502530000", { ...policy, allowedCountryCodes: ["*"] })).toMatchObject({ ok: true }));
});
