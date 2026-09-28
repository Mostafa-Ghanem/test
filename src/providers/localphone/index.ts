import type { ProviderAdapter } from "../types";

// Localphone: NO values are assumed. Every setting below must be taken from the real
// Localphone account / SIP settings page and set explicitly via env:
//   SIP_HOST, SIP_PORT, SIP_TRANSPORT, SIP_USERNAME, SIP_PASSWORD, SIP_FROM_NUMBER,
//   SIP_DIAL_FORMAT, SIP_REGISTER
// CLIR: the trunk sends RFC 3325 (anonymous From + PAI + "Privacy: id"). Whether Localphone
// honours this, or needs a CLIR prefix (SIP_DIAL_PREFIX), must be confirmed with Localphone.
export const localphone: ProviderAdapter = {
  id: "localphone",
  displayName: "Localphone",
  defaults: {},
  requiredEnv: ["SIP_HOST", "SIP_PORT", "SIP_TRANSPORT", "SIP_DIAL_FORMAT", "SIP_REGISTER"],
  privacyMethod: "rfc3325",
};
