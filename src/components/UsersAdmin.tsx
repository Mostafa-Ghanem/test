"use client";
import { useState } from "react";

export interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  enabled: boolean;
  extension: string | null;
  max_concurrent_calls: number;
  daily_minute_limit: number;
  daily_call_limit: number;
}

async function send(url: string, method: string, body: unknown) {
  const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) alert((await r.json().catch(() => ({}))).error ?? "error");
  else location.reload();
}

export function UsersAdmin({ rows }: { rows: AdminUserRow[] }) {
  const [edit, setEdit] = useState<Record<string, Partial<AdminUserRow>>>({});
  const set = (id: string, k: keyof AdminUserRow, v: number) => setEdit((e) => ({ ...e, [id]: { ...e[id], [k]: v } }));

  return (
    <div className="flex flex-col gap-6">
      <form
        className="card flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          send("/api/admin/users", "POST", { email: f.get("email"), password: f.get("password"), role: f.get("role") });
        }}
      >
        <input className="input max-w-60" name="email" type="email" placeholder="email" required />
        <input className="input max-w-60" name="password" type="password" placeholder="password (10+)" minLength={10} required />
        <select className="input max-w-28" name="role"><option>user</option><option>admin</option></select>
        <button className="btn bg-emerald-600">Create user</button>
      </form>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr><th>Email</th><th>Role</th><th>Ext</th><th>Max concurrent</th><th>Daily min</th><th>Daily calls</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const e = edit[u.id] ?? {};
              const numInput = (k: "max_concurrent_calls" | "daily_minute_limit" | "daily_call_limit") => (
                <input type="number" min={0} className="input w-24" defaultValue={u[k]} onChange={(ev) => set(u.id, k, Number(ev.target.value))} />
              );
              return (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.extension}</td>
                  <td>{numInput("max_concurrent_calls")}</td>
                  <td>{numInput("daily_minute_limit")}</td>
                  <td>{numInput("daily_call_limit")}</td>
                  <td>
                    <button className={`btn ${u.enabled ? "bg-slate-800" : "bg-red-900"}`} onClick={() => send(`/api/admin/users/${u.id}`, "PATCH", { enabled: !u.enabled })}>
                      {u.enabled ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn bg-slate-700"
                      disabled={!edit[u.id]}
                      onClick={() =>
                        send(`/api/admin/users/${u.id}`, "PATCH", {
                          maxConcurrentCalls: e.max_concurrent_calls,
                          dailyMinuteLimit: e.daily_minute_limit,
                          dailyCallLimit: e.daily_call_limit,
                        })
                      }
                    >
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
