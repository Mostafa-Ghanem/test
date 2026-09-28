import { describe, expect, it } from "vitest";
import { authorizeDial, parseCallRequest } from "@/lib/authorize";

const user = { enabled: true, extensionEnabled: true };
const usage = { activeCalls: 0, callsToday: 0, secondsToday: 0, callsLastMinute: 0 };
const limits = { maxConcurrentCalls: 1, dailyMinuteLimit: 10, dailyCallLimit: 5, callsPerMinute: 3 };
const dest = { ok: true as const, e164: "+201012345678", countryCode: "20" };

describe("dialing authorization", () => {
  it("allows a normal call", () => expect(authorizeDial(user, usage, limits, dest)).toEqual({ ok: true }));
  it("denies disabled users", () => expect(authorizeDial({ ...user, enabled: false }, usage, limits, dest)).toMatchObject({ ok: false, reason: "user_disabled" }));
  it("denies disabled extensions", () => expect(authorizeDial({ ...user, extensionEnabled: false }, usage, limits, dest)).toMatchObject({ ok: false }));
  it("denies invalid destinations", () =>
    expect(authorizeDial(user, usage, limits, { ok: false, reason: "service_number_blocked" })).toMatchObject({ ok: false, reason: "service_number_blocked" }));
  it("rate limits", () => expect(authorizeDial(user, { ...usage, callsLastMinute: 3 }, limits, dest)).toMatchObject({ reason: "rate_limited", status: 429 }));
});

describe("concurrent call limit", () => {
  it("denies when at limit", () => expect(authorizeDial(user, { ...usage, activeCalls: 1 }, limits, dest)).toMatchObject({ reason: "concurrent_limit" }));
  it("allows under a higher limit", () => expect(authorizeDial(user, { ...usage, activeCalls: 1 }, { ...limits, maxConcurrentCalls: 2 }, dest)).toEqual({ ok: true }));
  it("zero disables calling", () => expect(authorizeDial(user, usage, { ...limits, maxConcurrentCalls: 0 }, dest)).toMatchObject({ ok: false }));
});

describe("daily limits", () => {
  it("denies at daily call count", () => expect(authorizeDial(user, { ...usage, callsToday: 5 }, limits, dest)).toMatchObject({ reason: "daily_call_limit" }));
  it("denies at daily minutes", () => expect(authorizeDial(user, { ...usage, secondsToday: 600 }, limits, dest)).toMatchObject({ reason: "daily_minute_limit" }));
  it("allows just under daily minutes", () => expect(authorizeDial(user, { ...usage, secondsToday: 599 }, limits, dest)).toEqual({ ok: true }));
});

describe("no arbitrary caller ID", () => {
  it("accepts private only", () => expect(parseCallRequest({ destination: "010", callerIdentity: "private" })).toMatchObject({ ok: true, identityMode: "private" }));
  it("defaults to private", () => expect(parseCallRequest({ destination: "010" })).toMatchObject({ ok: true, identityMode: "private" }));
  it.each([
    { destination: "010", callerId: "+201000000000" },
    { destination: "010", from: "sip:+201000000000@x" },
    { destination: "010", pai: "<sip:+44@x>" },
    { destination: "010", headers: { "P-Asserted-Identity": "x" } },
    { destination: "010", callerIdentity: "+201000000000" },
    { destination: "010", callerIdentity: "verified" },
    { destination: "010", trunk: "other" },
  ])("rejects %o", (b) => expect(parseCallRequest(b)).toEqual({ ok: false, reason: "invalid_request" }));
});
