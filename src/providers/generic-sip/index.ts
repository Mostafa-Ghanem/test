import type { ProviderAdapter } from "../types";

// Any RFC 3261/3325 SIP trunk. All values come from SIP_* env vars.
export const genericSip: ProviderAdapter = {
  id: "generic-sip",
  displayName: "Generic SIP trunk",
  defaults: { port: 5060, transport: "udp", dialFormat: "e164", register: true },
  privacyMethod: "rfc3325",
};
