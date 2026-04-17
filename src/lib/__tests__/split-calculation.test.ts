import { describe, it, expect } from "vitest";

// Extract the split calculation logic as a pure function for testing.
// This mirrors what addExpense does in src/actions/expense.ts.
function calculateSplits(
  amount: number,
  members: { userId: string; ownershipPct: number }[]
): { userId: string; sharePct: number; shareAmount: number }[] {
  return members.map((m) => ({
    userId: m.userId,
    sharePct: m.ownershipPct,
    shareAmount: Math.round(amount * m.ownershipPct) / 100,
  }));
}

function calculateBalances(
  expenses: {
    paidBy: string;
    splits: { userId: string; shareAmount: number }[];
  }[]
): Map<string, Map<string, number>> {
  // Build pairwise debts: debtor -> creditor -> amount
  const debts = new Map<string, Map<string, number>>();

  for (const expense of expenses) {
    for (const split of expense.splits) {
      if (split.userId === expense.paidBy) continue;
      const debtorMap = debts.get(split.userId) ?? new Map<string, number>();
      const current = debtorMap.get(expense.paidBy) ?? 0;
      debtorMap.set(expense.paidBy, current + split.shareAmount);
      debts.set(split.userId, debtorMap);
    }
  }

  return debts;
}

describe("calculateSplits", () => {
  it("splits evenly between two members", () => {
    const splits = calculateSplits(1000, [
      { userId: "a", ownershipPct: 50 },
      { userId: "b", ownershipPct: 50 },
    ]);

    expect(splits).toHaveLength(2);
    expect(splits[0].shareAmount).toBe(500);
    expect(splits[1].shareAmount).toBe(500);
  });

  it("splits by unequal ownership", () => {
    const splits = calculateSplits(1000, [
      { userId: "a", ownershipPct: 60 },
      { userId: "b", ownershipPct: 40 },
    ]);

    expect(splits[0].shareAmount).toBe(600);
    expect(splits[1].shareAmount).toBe(400);
  });

  it("handles three-way split with percentages", () => {
    const splits = calculateSplits(3000, [
      { userId: "a", ownershipPct: 50 },
      { userId: "b", ownershipPct: 30 },
      { userId: "c", ownershipPct: 20 },
    ]);

    expect(splits[0].shareAmount).toBe(1500);
    expect(splits[1].shareAmount).toBe(900);
    expect(splits[2].shareAmount).toBe(600);
  });

  it("preserves ownership percentage in split", () => {
    const splits = calculateSplits(1000, [
      { userId: "a", ownershipPct: 33.33 },
      { userId: "b", ownershipPct: 66.67 },
    ]);

    expect(splits[0].sharePct).toBe(33.33);
    expect(splits[1].sharePct).toBe(66.67);
  });

  it("handles single member (100% ownership)", () => {
    const splits = calculateSplits(500, [
      { userId: "a", ownershipPct: 100 },
    ]);

    expect(splits).toHaveLength(1);
    expect(splits[0].shareAmount).toBe(500);
  });
});

describe("calculateBalances", () => {
  it("single expense: non-payer owes payer their share", () => {
    const debts = calculateBalances([
      {
        paidBy: "a",
        splits: [
          { userId: "a", shareAmount: 500 },
          { userId: "b", shareAmount: 500 },
        ],
      },
    ]);

    // b owes a 500
    expect(debts.get("b")?.get("a")).toBe(500);
    // a does not owe anyone
    expect(debts.get("a")).toBeUndefined();
  });

  it("two expenses net out", () => {
    const debts = calculateBalances([
      {
        paidBy: "a",
        splits: [
          { userId: "a", shareAmount: 500 },
          { userId: "b", shareAmount: 500 },
        ],
      },
      {
        paidBy: "b",
        splits: [
          { userId: "a", shareAmount: 300 },
          { userId: "b", shareAmount: 300 },
        ],
      },
    ]);

    // b owes a: 500, a owes b: 300
    // Net: b owes a 200
    const bOwesA = debts.get("b")?.get("a") ?? 0;
    const aOwesB = debts.get("a")?.get("b") ?? 0;
    expect(bOwesA - aOwesB).toBe(200);
  });

  it("no expenses means no debts", () => {
    const debts = calculateBalances([]);
    expect(debts.size).toBe(0);
  });

  it("payer paying for themselves creates no self-debt", () => {
    const debts = calculateBalances([
      {
        paidBy: "a",
        splits: [{ userId: "a", shareAmount: 1000 }],
      },
    ]);

    expect(debts.size).toBe(0);
  });
});
