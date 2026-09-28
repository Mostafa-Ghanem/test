/* Writes generated Asterisk includes locally (alternative to the /api/voice/config pull). */
import { mkdirSync, writeFileSync } from "node:fs";
import { pool } from "../src/lib/db";
import { renderUsersPjsip } from "../src/lib/sip";
import { loadProviderConfig, renderTrunkPjsip, validateProviderConfig } from "../src/providers";

async function main() {
  const out = process.argv[2] || "infra/asterisk/generated";
  mkdirSync(out, { recursive: true });
  const rows = (await pool().query(
    "SELECT s.extension, (s.enabled AND u.enabled) AS enabled FROM sip_extensions s JOIN users u ON u.id = s.user_id",
  )).rows;
  writeFileSync(`${out}/pjsip_users.conf`, renderUsersPjsip(rows));
  const cfg = loadProviderConfig();
  const v = validateProviderConfig(cfg);
  writeFileSync(`${out}/pjsip_provider.conf`, v.configured ? renderTrunkPjsip(cfg!) : "; SIP provider not configured\n");
  if (!v.configured) console.warn("Provider not configured:", v.errors.join("; "));
  await pool().end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
