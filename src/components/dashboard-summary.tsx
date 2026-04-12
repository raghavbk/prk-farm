import { formatINR } from "@/lib/format";

type Props = {
  totalYouOwe: number;
  totalOwedToYou: number;
};

export function DashboardSummary({ totalYouOwe, totalOwedToYou }: Props) {
  const net = totalOwedToYou - totalYouOwe;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="stat-card text-danger" style={{ background: "linear-gradient(135deg, #fff1f2, #ffe4e6)" }}>
        <p className="text-xs font-bold uppercase tracking-wider opacity-60">You Owe</p>
        <p className="mt-2 font-display text-2xl font-bold">{formatINR(totalYouOwe)}</p>
      </div>
      <div className="stat-card text-success" style={{ background: "linear-gradient(135deg, #ecfdf5, #d1fae5)" }}>
        <p className="text-xs font-bold uppercase tracking-wider opacity-60">Owed to You</p>
        <p className="mt-2 font-display text-2xl font-bold">{formatINR(totalOwedToYou)}</p>
      </div>
      <div
        className="col-span-2 stat-card text-center"
        style={{
          background: net >= 0
            ? "linear-gradient(135deg, #eef2ff, #e0e7ff)"
            : "linear-gradient(135deg, #fff7ed, #ffedd5)",
          color: net >= 0 ? "var(--color-primary)" : "var(--color-warning)",
        }}
      >
        <p className="text-xs font-bold uppercase tracking-wider opacity-60">Net Balance</p>
        <p className="mt-2 font-display text-3xl font-bold">
          {net >= 0 ? "+" : ""}{formatINR(Math.abs(net))}
        </p>
        <p className="mt-1 text-xs font-medium opacity-50">
          {net < 0 ? "you owe overall" : net > 0 ? "owed to you overall" : "all settled up!"}
        </p>
      </div>
    </div>
  );
}
