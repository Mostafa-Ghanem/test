import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { dict, toLang } from "@/lib/i18n";
import { Nav } from "@/components/Nav";
import { CallsTable, type CallListRow } from "@/components/CallsTable";

export const dynamic = "force-dynamic";

export default async function History() {
  const user = await requireUser();
  const t = dict(toLang((await cookies()).get("lang")?.value));
  const rows = await q<CallListRow>(
    "SELECT * FROM calls WHERE user_id = $1 ORDER BY started_at DESC LIMIT 100",
    [user.id],
  );
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <Nav admin={user.role === "admin"} labels={t} />
      <h1 className="text-xl font-semibold">{t.history}</h1>
      <CallsTable rows={rows} />
    </main>
  );
}
