// Debt minimization algorithm used by both the Balances tab and the Settle form.
// Reduces N pairwise IOUs to the smallest number of transfers by netting each
// person's overall position (creditor = net positive, debtor = net negative) and
// greedily pairing the largest creditor with the largest debtor.
export type BalanceRow = {
  creditor_id: string;
  debtor_id: string;
  net_amount: number | string;
};

export type Transfer = { from: string; to: string; amount: number };

export function simplifyTransfers(rows: BalanceRow[]): Transfer[] {
  // Compute each person's net position across all raw pairwise balances.
  const net = new Map<string, number>();
  for (const b of rows) {
    net.set(b.creditor_id, (net.get(b.creditor_id) ?? 0) + Number(b.net_amount));
    net.set(b.debtor_id,   (net.get(b.debtor_id)   ?? 0) - Number(b.net_amount));
  }

  // Separate into creditors (net > 0) and debtors (net < 0), sorted largest first.
  const creditors = [...net.entries()].filter(([, v]) => v > 1).sort((a, b) => b[1] - a[1]);
  const debtors   = [...net.entries()].filter(([, v]) => v < -1).sort((a, b) => a[1] - b[1]);

  const out: Transfer[] = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const [dId, dVal] = debtors[i];
    const [cId, cVal] = creditors[j];
    const amt = Math.round(Math.min(-dVal, cVal));

    if (amt > 1) out.push({ from: dId, to: cId, amount: amt });

    debtors[i][1]  = dVal + amt;
    creditors[j][1] = cVal - amt;

    if (Math.abs(debtors[i][1])   < 1) i++;
    if (Math.abs(creditors[j][1]) < 1) j++;
  }

  return out;
}
