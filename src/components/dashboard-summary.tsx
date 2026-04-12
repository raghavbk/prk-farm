import { formatINR } from "@/lib/format";

type Props = {
  totalYouOwe: number;
  totalOwedToYou: number;
};

export function DashboardSummary({ totalYouOwe, totalOwedToYou }: Props) {
  const net = totalOwedToYou - totalYouOwe;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="card-surface p-4" style={{ background: "var(--color-terra-wash)" }}>
        <p className="section-label" style={{ color: "var(--color-terra)" }}>
          You Owe
        </p>
        <p className="mt-1.5 font-display text-xl font-semibold" style={{ color: "var(--color-terra)" }}>
          {formatINR(totalYouOwe)}
        </p>
      </div>
      <div className="card-surface p-4" style={{ background: "var(--color-sage-wash)" }}>
        <p className="section-label" style={{ color: "var(--color-sage)" }}>
          Owed to You
        </p>
        <p className="mt-1.5 font-display text-xl font-semibold" style={{ color: "var(--color-sage)" }}>
          {formatINR(totalOwedToYou)}
        </p>
      </div>
      <div className="col-span-2 card-surface p-5 text-center" style={{ background: "var(--color-amber-wash)" }}>
        <p className="section-label">Net Balance</p>
        <p
          className="mt-2 font-display text-2xl font-semibold"
          style={{ color: net >= 0 ? "var(--color-sage)" : "var(--color-terra)" }}
        >
          {net >= 0 ? "+" : ""}
          {formatINR(Math.abs(net))}
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          {net < 0 ? "you owe overall" : net > 0 ? "owed to you overall" : "all settled"}
        </p>
      </div>
    </div>
  );
}
