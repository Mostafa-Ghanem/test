import { voiceAuthorize } from "@/lib/calls";
import { voiceAuthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Asterisk dialplan → app. Plain text response parsed with CUT() in extensions.conf. */
export async function GET(req: Request) {
  if (!voiceAuthorized(req)) return new Response("DENY|unauthorized", { status: 401 });
  const u = new URL(req.url);
  const line = await voiceAuthorize(u.searchParams.get("token") ?? "", u.searchParams.get("endpoint") ?? "");
  return new Response(line, { headers: { "content-type": "text/plain" } });
}
