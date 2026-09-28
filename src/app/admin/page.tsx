import { q } from "@/lib/db";
import { ACTIVE_SQL } from "@/lib/calls";

export default async function AdminDashboard() {
  const [s] = await q<Record<string, string>>(
    `SELECT (SELECT count(*) FROM users) AS users,
            count(*) FILTER (WHERE ${ACTIVE_SQL}) AS active,
            count(*) FILTER (WHERE started_at >= date_trunc('day', now())) AS today,
            count(*) FILTER (WHERE answered_at IS NOT NULL AND started_at >= date_trunc('day', now())) AS answered,
            round(coalesce(sum(billable_seconds), 0) / 60.0, 1) AS minutes,
            coalesce(sum(cost), 0) AS cost,
            count(*) FILTER (WHERE status = 'failed' AND started_at >= date_trunc('day', now())) AS failed
       FROM calls`,
  );
  const cards = [
    ["Users", s.users],
    ["Active calls", s.active],
    ["Calls today", s.today],
    ["Answered today", s.answered],
    ["Total minutes", s.minutes],
    ["Est. provider cost", Number(s.cost).toFixed(2)],
    ["Failed today", s.failed],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map(([k, v]) => (
        <div key={k} className="card">
          <p className="text-sm text-slate-400">{k}</p>
          <p className="text-2xl font-semibold">{v}</p>
        </div>
      ))}
    </div>
  );
}
