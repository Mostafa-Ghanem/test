import { q } from "@/lib/db";
import { voiceAuthorized } from "@/lib/http";
import { renderUsersPjsip } from "@/lib/sip";
import { loadProviderConfig, renderTrunkPjsip, validateProviderConfig } from "@/providers";

export const dynamic = "force-dynamic";

/**
 * Voice VM pulls generated Asterisk includes (infra/asterisk/sync-config.sh).
 * ?file=users → pjsip_users.conf, ?file=provider → pjsip_provider.conf
 */
export async function GET(req: Request) {
  if (!voiceAuthorized(req)) return new Response("unauthorized", { status: 401 });
  const file = new URL(req.url).searchParams.get("file");
  let body: string;
  if (file === "users") {
    body = renderUsersPjsip(await q<{ extension: string; enabled: boolean }>(
      `SELECT s.extension, (s.enabled AND u.enabled) AS enabled FROM sip_extensions s JOIN users u ON u.id = s.user_id ORDER BY s.extension`,
    ));
  } else if (file === "provider") {
    const cfg = loadProviderConfig();
    body = cfg && validateProviderConfig(cfg).configured ? renderTrunkPjsip(cfg) : "; SIP provider not configured\n";
  } else return new Response("bad file", { status: 400 });
  return new Response(body, { headers: { "content-type": "text/plain", "cache-control": "no-store" } });
}
