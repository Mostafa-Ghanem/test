export type DialFormat = "e164" | "digits" | "intl00";

export interface ProviderConfig {
  provider: string;
  host: string;
  port: number;
  transport: "udp" | "tcp" | "tls";
  username: string;
  password: string;
  fromNumber: string;
  privacyEnabled: boolean;
  dialFormat?: DialFormat;
  dialPrefix?: string;
  register?: boolean;
}

/**
 * A provider adapter is the ONLY place that knows provider specifics.
 * Asterisk dialplan and UI always talk to the fixed trunk name "provider-trunk".
 */
export interface ProviderAdapter {
  id: string;
  displayName: string;
  defaults: Partial<ProviderConfig>;
  /** How privacy (CLIR) is requested upstream. rfc3325 = Privacy: id + PAI, anonymous From. */
  privacyMethod: "rfc3325";
}
