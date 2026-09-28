import { describe, expect, it } from "vitest";
import { formatDialNumber, loadProviderConfig, renderTrunkPjsip, TRUNK_NAME, validateProviderConfig } from "@/providers";

const base = { SIP_USERNAME: "acct", SIP_PASSWORD: "secret", SIP_FROM_NUMBER: "+442000000000" };

describe("provider configuration validation", () => {
  it("not configured without SIP_PROVIDER", () => expect(validateProviderConfig(loadProviderConfig({}))).toMatchObject({ configured: false }));
  it("localphone uses adapter defaults", () => {
    const cfg = loadProviderConfig({ ...base, SIP_PROVIDER: "localphone" })!;
    expect(cfg.host).toBe("sip.localphone.com");
    expect(validateProviderConfig(cfg)).toEqual({ configured: true, errors: [] });
  });
  it("telnyx is a drop-in swap", () => expect(validateProviderConfig(loadProviderConfig({ ...base, SIP_PROVIDER: "telnyx" }))).toMatchObject({ configured: true }));
  it("generic-sip requires host", () => {
    const v = validateProviderConfig(loadProviderConfig({ ...base, SIP_PROVIDER: "generic-sip" }));
    expect(v.configured).toBe(false);
    expect(v.errors.join()).toMatch(/SIP_HOST/);
  });
  it("rejects unknown providers and missing secrets", () => {
    const v = validateProviderConfig(loadProviderConfig({ SIP_PROVIDER: "nope", SIP_HOST: "x.y" }));
    expect(v.errors).toEqual(expect.arrayContaining(["Unknown SIP_PROVIDER \"nope\"", "SIP_PASSWORD missing"]));
  });
  it("rejects config injection", () =>
    expect(validateProviderConfig(loadProviderConfig({ ...base, SIP_PROVIDER: "telnyx", SIP_PASSWORD: "x\n[evil]" })).configured).toBe(false));
  it("privacy defaults on", () => expect(loadProviderConfig({ ...base, SIP_PROVIDER: "telnyx" })!.privacyEnabled).toBe(true));
});

describe("provider rendering", () => {
  it("formats dial numbers", () => {
    expect(formatDialNumber("+201012345678", { dialFormat: "e164" })).toBe("+201012345678");
    expect(formatDialNumber("+201012345678", { dialFormat: "digits" })).toBe("201012345678");
    expect(formatDialNumber("+201012345678", { dialFormat: "intl00", dialPrefix: "9" })).toBe("900201012345678");
  });
  it("always renders the same trunk name with RFC 3325 privacy", () => {
    for (const p of ["localphone", "telnyx"]) {
      const conf = renderTrunkPjsip(loadProviderConfig({ ...base, SIP_PROVIDER: p })!);
      expect(conf).toContain(`[${TRUNK_NAME}]`);
      expect(conf).toContain("send_pai=yes");
      expect(conf).toContain("trust_id_outbound=yes");
    }
  });
});
