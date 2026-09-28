import { q } from "@/lib/db";
import { CallsTable, type CallListRow } from "@/components/CallsTable";

export default async function AdminCalls() {
  const rows = await q<CallListRow>(
    "SELECT c.*, u.email FROM calls c JOIN users u ON u.id = c.user_id ORDER BY c.started_at DESC LIMIT 200",
  );
  return <CallsTable rows={rows} admin />;
}
