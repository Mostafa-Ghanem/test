import { describe, expect, it } from "vitest";
import { MemoryCdrStore, mapDisposition, processCdr } from "@/lib/cdr";

const callId = "3f1c1f5e-8e1a-4c1b-9d6e-2f9a3b7c1d00";

describe("CDR idempotency", () => {
  it("processes a CDR once, ignores duplicates", async () => {
    const store = new MemoryCdrStore();
    const cdr = { callId, uniqueId: "1700000000.42", disposition: "ANSWER", billsec: "61", duration: "70" };
    expect(await processCdr(store, cdr, 0.02)).toEqual({ processed: true });
    expect(await processCdr(store, cdr, 0.02)).toEqual({ processed: false, duplicate: true });
    expect(store.finalizeCount).toBe(1);
    expect(store.finalized[callId]).toMatchObject({ status: "completed", billableSeconds: 61, cost: 0.04 });
  });

  it("rejects malformed CDRs", async () => {
    expect(await processCdr(new MemoryCdrStore(), { callId: "nope" }, 0.02)).toMatchObject({ error: "invalid_cdr" });
  });

  it("does not bill unanswered calls", async () => {
    const store = new MemoryCdrStore();
    await processCdr(store, { callId, uniqueId: "u2", disposition: "BUSY", billsec: 5 }, 0.02);
    expect(store.finalized[callId]).toMatchObject({ status: "busy", billableSeconds: 0, cost: 0 });
  });

  it.each([
    ["ANSWER", "completed"], ["ANSWERED", "completed"], ["BUSY", "busy"], ["NOANSWER", "no_answer"],
    ["NO ANSWER", "no_answer"], ["CANCEL", "no_answer"], ["CONGESTION", "failed"], ["CHANUNAVAIL", "failed"],
  ])("maps %s → %s", (d, s) => expect(mapDisposition(d, 0)).toBe(s));
});
