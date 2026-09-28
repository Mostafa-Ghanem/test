import type { ProviderAdapter } from "../types";

// Telnyx credential-based SIP connection. SIP_FROM_NUMBER must be a Telnyx number
// on the account (sent in P-Asserted-Identity, hidden by Privacy: id).
export const telnyx: ProviderAdapter = {
  id: "telnyx",
  displayName: "Telnyx",
  defaults: { host: "sip.telnyx.com", port: 5060, transport: "udp", dialFormat: "e164", register: true },
  privacyMethod: "rfc3325",
};
