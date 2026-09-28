import { q } from "@/lib/db";
import { UsersAdmin, type AdminUserRow } from "@/components/UsersAdmin";

export default async function AdminUsers() {
  const rows = await q<AdminUserRow>(
    `SELECT u.id, u.email, u.role, u.enabled, s.extension,
            l.max_concurrent_calls, l.daily_minute_limit, l.daily_call_limit
       FROM users u LEFT JOIN sip_extensions s ON s.user_id = u.id LEFT JOIN usage_limits l ON l.user_id = u.id
      ORDER BY u.created_at`,
  );
  return <UsersAdmin rows={rows} />;
}
