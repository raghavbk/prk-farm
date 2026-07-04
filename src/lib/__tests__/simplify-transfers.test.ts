import { describe, it, expect } from "vitest";
import { simplifyTransfers } from "../simplify-transfers";

describe("simplifyTransfers", () => {
  it("returns no transfers when there are no balances", () => {
    expect(simplifyTransfers([])).toEqual([]);
  });

  it("converts a single pairwise debt into one transfer", () => {
    const result = simplifyTransfers([
      { creditor_id: "alice", debtor_id: "bob", net_amount: 1000 },
    ]);
    expect(result).toEqual([{ from: "bob", to: "alice", amount: 1000 }]);
  });

  it("minimises three-person chain: A→B, B→C collapses to A→C", () => {
    // A paid for B (B owes A 500), B paid for C (C owes B 500).
    // Net: A +500, B 0, C -500  →  one transfer: C pays A 500.
    const result = simplifyTransfers([
      { creditor_id: "alice", debtor_id: "bob",   net_amount: 500 },
      { creditor_id: "bob",   debtor_id: "carol",  net_amount: 500 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ from: "carol", to: "alice", amount: 500 });
  });

  it("handles two creditors and two debtors", () => {
    // alice and bob each paid 300, carol and dave each owe 300.
    const result = simplifyTransfers([
      { creditor_id: "alice", debtor_id: "carol", net_amount: 300 },
      { creditor_id: "bob",   debtor_id: "dave",  net_amount: 300 },
    ]);
    expect(result).toHaveLength(2);
    const total = result.reduce((s, t) => s + t.amount, 0);
    expect(total).toBe(600);
  });

  it("produces fewer transfers than raw pairwise rows when debts cancel", () => {
    // alice owes bob 1000, bob owes carol 600, carol owes alice 400.
    // Net: alice -600, bob +400, carol +200  →  2 transfers max.
    const result = simplifyTransfers([
      { creditor_id: "bob",   debtor_id: "alice", net_amount: 1000 },
      { creditor_id: "carol", debtor_id: "bob",   net_amount: 600  },
      { creditor_id: "alice", debtor_id: "carol", net_amount: 400  },
    ]);
    expect(result.length).toBeLessThan(3);
    const total = result.reduce((s, t) => s + t.amount, 0);
    expect(total).toBeGreaterThan(0);
  });

  it("ignores amounts below the ₹1 rounding threshold", () => {
    // Sub-rupee floating-point noise should be silently dropped.
    const result = simplifyTransfers([
      { creditor_id: "alice", debtor_id: "bob", net_amount: 0.5 },
    ]);
    expect(result).toEqual([]);
  });

  it("accepts net_amount as a string (Supabase numeric columns come as strings)", () => {
    const result = simplifyTransfers([
      { creditor_id: "alice", debtor_id: "bob", net_amount: "2500" },
    ]);
    expect(result).toEqual([{ from: "bob", to: "alice", amount: 2500 }]);
  });
});
