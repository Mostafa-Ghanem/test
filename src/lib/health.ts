import { q } from "./db";
import { isDemo } from "./env";
import { loadProviderConfig, validateProviderConfig } from "@/providers";

export interface Health {
  app: "ready";
  database: "ready" | "not_configured" | "error";
  voiceServer: "ready" | "unknown" | "unreachable";
  sipProvider: "configured" | "not_configured";
  provider: string | null;
  demoMode: boolean;
}

export async function getHealth(): Promise<Health> {
  let database: Health["database"] = "not_configured";
  if (process.env.DATABASE_URL) {
    try {
      await Promise.race([q("SELECT 1"), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 3000))]);
      database = "ready";
    } catch {
      database = "error";
    }
  }
  let voiceServer: Health["voiceServer"] = "unknown";
  if (process.env.VOICE_HEALTH_URL) {
    try {
      const r = await fetch(process.env.VOICE_HEALTH_URL, { signal: AbortSignal.timeout(3000), cache: "no-store" });
      voiceServer = r.ok ? "ready" : "unreachable";
    } catch {
      voiceServer = "unreachable";
    }
  }
  const cfg = loadProviderConfig();
  const configured = validateProviderConfig(cfg).configured;
  return {
    app: "ready",
    database,
    voiceServer,
    sipProvider: configured ? "configured" : "not_configured",
    provider: cfg?.provider ?? null,
    demoMode: isDemo(),
  };
}
