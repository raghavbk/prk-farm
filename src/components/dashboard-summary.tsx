import { formatINR } from "@/lib/format";

type Props = {
  totalYouOwe: number;
  totalOwedToYou: number;
};

export function DashboardSummary({ totalYouOwe, totalOwedToYou }: Props) {
  const net = totalOwedToYou - totalYouOwe;

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* You Owe */}
      <div className="relative overflow-hidden rounded-2xl p-5 border border-danger/20"
        style={{ background: "linear-gradient(135deg, rgba(251,113,133,0.08) 0%, rgba(244,63,94,0.04) 100%)" }}
      >
        <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-danger/5" />
        <div className="absolute -bottom-4 -right-2 h-12 w-12 rounded-full bg-danger/5" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-danger"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" /></svg>
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-danger/60">You Owe</p>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-danger">{formatINR(totalYouOwe)}</p>
        </div>
      </div>

      {/* Owed to You */}
      <div className="relative overflow-hidden rounded-2xl p-5 border border-success/20"
        style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.08) 0%, rgba(16,185,129,0.04) 100%)" }}
      >
        <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-success/5" />
        <div className="absolute -bottom-4 -right-2 h-12 w-12 rounded-full bg-success/5" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-success"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" /></svg>
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-success/60">Owed to You</p>
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-success">{formatINR(totalOwedToYou)}</p>
        </div>
      </div>

      {/* Net Balance */}
      <div className="col-span-2 relative overflow-hidden rounded-2xl p-6 text-center border"
        style={{
          borderColor: net >= 0 ? "rgba(129,140,248,0.2)" : "rgba(251,191,36,0.2)",
          background: net >= 0
            ? "linear-gradient(135deg, rgba(129,140,248,0.06) 0%, rgba(124,58,237,0.04) 100%)"
            : "linear-gradient(135deg, rgba(251,191,36,0.06) 0%, rgba(245,158,11,0.04) 100%)",
        }}
      >
        <div className="absolute top-0 left-1/4 w-32 h-32 rounded-full bg-primary/5" />
        <div className="absolute -bottom-10 right-1/3 w-24 h-24 rounded-full bg-primary/3" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-wider"
            style={{ color: net >= 0 ? "rgba(129,140,248,0.6)" : "rgba(251,191,36,0.6)" }}
          >
            Net Balance
          </p>
          <p className="mt-3 font-display text-4xl font-bold"
            style={{ color: net >= 0 ? "var(--color-primary)" : "var(--color-warning)" }}
          >
            {net >= 0 ? "+" : ""}{formatINR(Math.abs(net))}
          </p>
          <p className="mt-2 text-xs font-medium text-ink-faint">
            {net < 0 ? "you owe overall" : net > 0 ? "owed to you overall" : "all settled up!"}
          </p>
        </div>
      </div>
    </div>
  );
}
