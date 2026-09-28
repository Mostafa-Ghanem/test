export interface CallListRow {
  id: string;
  email?: string;
  destination: string;
  status: string;
  provider?: string;
  caller_identity_mode: string;
  demo: boolean;
  started_at: Date;
  duration: number | null;
  billable_seconds: number;
  cost?: string;
}

export function CallsTable({ rows, admin = false }: { rows: CallListRow[]; admin?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Started</th>
            {admin && <th>User</th>}
            <th>Destination</th>
            <th>Status</th>
            <th>Identity</th>
            <th>Billable</th>
            {admin && <th>Provider</th>}
            {admin && <th>Cost</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td className="whitespace-nowrap">{new Date(c.started_at).toISOString().replace("T", " ").slice(0, 19)}</td>
              {admin && <td>{c.email}</td>}
              <td dir="ltr">{c.destination}</td>
              <td>{c.status}{c.demo && <span className="ms-1 text-xs text-amber-400">demo</span>}</td>
              <td>🔒 {c.caller_identity_mode}</td>
              <td>{c.billable_seconds}s</td>
              {admin && <td>{c.provider}</td>}
              {admin && <td>{Number(c.cost ?? 0).toFixed(4)}</td>}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={8} className="text-slate-500">No calls yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
