import { z } from "zod";

export const CALL_STATUSES = ["initiated", "ringing", "answered", "completed", "failed", "busy", "no_answer"] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

const num = z.coerce.number().finite().nonnegative();
const epoch = z.union([z.coerce.number(), z.literal("")]).optional();

export const cdrSchema = z.object({
  callId: z.string().uuid(),
  uniqueId: z.string().min(1).max(128),
  disposition: z.string().max(32).default(""),
  billsec: num.default(0),
  duration: num.default(0),
  start: epoch,
  answer: epoch,
  end: epoch,
});
export type CdrPayload = z.infer<typeof cdrSchema>;

/** Maps Asterisk DIALSTATUS / CDR disposition to our status. */
export function mapDisposition(d: string, billsec: number): CallStatus {
  const s = d.toUpperCase().replace(/[\s_]/g, "");
  if (s === "ANSWER" || s === "ANSWERED") return "completed";
  if (s === "BUSY") return "busy";
  if (s === "NOANSWER" || s === "CANCEL") return "no_answer";
  if (!s && billsec > 0) return "completed";
  return "failed";
}

export interface FinalizeFields {
  status: CallStatus;
  answeredAt: Date | null;
  endedAt: Date;
  duration: number;
  billableSeconds: number;
  cost: number;
}

export interface CdrStore {
  /** Returns true only the first time a key is seen (idempotency). */
  insertEventOnce(key: string, callId: string, type: string, payload: unknown): Promise<boolean>;
  finalizeCall(callId: string, f: FinalizeFields): Promise<void>;
}

const toDate = (v: unknown) => (typeof v === "number" && v > 0 ? new Date(v * 1000) : null);

export async function processCdr(
  store: CdrStore,
  raw: unknown,
  ratePerMinute: number,
): Promise<{ processed: boolean; duplicate?: boolean; error?: string }> {
  const r = cdrSchema.safeParse(raw);
  if (!r.success) return { processed: false, error: "invalid_cdr" };
  const p = r.data;
  const first = await store.insertEventOnce(`cdr:${p.uniqueId}`, p.callId, "cdr", p);
  if (!first) return { processed: false, duplicate: true };
  const billsec = Math.floor(p.billsec);
  const status = mapDisposition(p.disposition, billsec);
  await store.finalizeCall(p.callId, {
    status,
    answeredAt: toDate(p.answer) ?? (billsec > 0 ? new Date(Date.now() - billsec * 1000) : null),
    endedAt: toDate(p.end) ?? new Date(),
    duration: Math.floor(p.duration),
    billableSeconds: status === "completed" ? billsec : 0,
    cost: status === "completed" ? Math.round((Math.ceil(billsec / 60) * ratePerMinute) * 10000) / 10000 : 0,
  });
  return { processed: true };
}

export class MemoryCdrStore implements CdrStore {
  keys = new Set<string>();
  finalized: Record<string, FinalizeFields> = {};
  finalizeCount = 0;
  async insertEventOnce(key: string) {
    if (this.keys.has(key)) return false;
    this.keys.add(key);
    return true;
  }
  async finalizeCall(callId: string, f: FinalizeFields) {
    this.finalizeCount++;
    this.finalized[callId] = f;
  }
}
