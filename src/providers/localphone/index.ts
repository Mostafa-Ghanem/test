import type { ProviderAdapter } from "../types";

// Localphone SIP: register with account username/password.
// Verify host/port/dial format with Localphone docs when credentials are added;
// every value is overridable via SIP_* env vars.
export const localphone: ProviderAdapter = {
  id: "localphone",
  displayName: "Localphone",
  defaults: { host: "sip.localphone.com", port: 5060, transport: "udp", dialFormat: "digits", register: true },
  privacyMethod: "rfc3325",
};
