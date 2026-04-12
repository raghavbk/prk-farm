import { formatINR } from "@/lib/format";

type Props = {
  totalYouOwe: number;
  totalOwedToYou: number;
};

export function DashboardSummary({ totalYouOwe, totalOwedToYou }: Props) {
  const net = totalOwedToYou - totalYouOwe;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* You Owe */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-danger-wash flex items-center justify-center">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-danger"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" /></svg>
          </div>
          <span className="text-[13px] font-medium text-ink-faint">You Owe</span>
        </div>
        <p className="font-display text-[28px] font-bold text-danger leading-none">{formatINR(totalYouOwe)}</p>
      </div>

      {/* Owed to You */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-success-wash flex items-center justify-center">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-success"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" /></svg>
          </div>
          <span className="text-[13px] font-medium text-ink-faint">Owed to You</span>
        </div>
        <p className="font-display text-[28px] font-bold text-success leading-none">{formatINR(totalOwedToYou)}</p>
      </div>

      {/* Net */}
      <div className="card p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ background: net >= 0 ? "radial-gradient(circle at 80% 20%, #d4a853, transparent 60%)" : "radial-gradient(circle at 80% 20%, #ef5f5f, transparent 60%)" }}
        />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary-wash flex items-center justify-center">
              <span className="font-display text-sm font-bold text-primary">=</span>
            </div>
            <span className="text-[13px] font-medium text-ink-faint">Net Balance</span>
          </div>
          <p className="font-display text-[28px] font-bold leading-none"
            style={{ color: net >= 0 ? "var(--color-success)" : "var(--color-danger)" }}
          >
            {net >= 0 ? "+" : ""}{formatINR(Math.abs(net))}
          </p>
          <p className="mt-2 text-[11px] text-ink-faint font-medium">
            {net < 0 ? "you owe overall" : net > 0 ? "owed to you" : "settled"}
          </p>
        </div>
      </div>
    </div>
  );
}
