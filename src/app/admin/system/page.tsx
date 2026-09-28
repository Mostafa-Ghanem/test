import { getHealth } from "@/lib/health";
import { loadProviderConfig, validateProviderConfig } from "@/providers";

const label: Record<string, string> = {
  ready: "Ready", configured: "Configured", not_configured: "Not configured",
  unknown: "Unknown", unreachable: "Unreachable", error: "Error",
};

export default async function AdminSystem() {
  const h = await getHealth();
  const v = validateProviderConfig(loadProviderConfig());
  const rows: [string, string][] = [
    ["App", label[h.app]],
    ["Database", label[h.database]],
    ["Voice server", label[h.voiceServer]],
    ["SIP Provider", `${label[h.sipProvider]}${h.provider ? ` (${h.provider})` : ""}`],
    ["Mode", h.demoMode ? "DEMO_MODE (simulated calls)" : "Live"],
  ];
  return (
    <div className="card max-w-lg">
      <table>
        <tbody>
          {rows.map(([k, val]) => (
            <tr key={k}><th>{k}</th><td>{val}</td></tr>
          ))}
        </tbody>
      </table>
      {!v.configured && (
        <ul className="mt-3 list-disc ps-5 text-xs text-slate-400">
          {v.errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
    </div>
  );
}
