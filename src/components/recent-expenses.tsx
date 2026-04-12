import { formatINR } from "@/lib/format";
import Link from "next/link";

type RecentExpense = { id: string; group_id: string; description: string; amount: number; date: string; paidByName: string; groupName: string; };
type Props = { expenses: RecentExpense[]; };

export function RecentExpenses({ expenses }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-[13px] text-ink-faint">No expenses yet</p>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-white/[0.04] overflow-hidden">
      {expenses.map((e) => (
        <Link
          key={e.id}
          href={`/groups/${e.group_id}`}
          transitionTypes={["nav-forward"]}
          className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-ink/90 truncate">{e.description}</p>
            <p className="mt-1 text-[12px] text-ink-faint">{e.paidByName} · {e.groupName}</p>
          </div>
          <div className="ml-4 text-right shrink-0">
            <p className="font-display text-[14px] font-bold text-primary">{formatINR(e.amount)}</p>
            <p className="text-[11px] text-ink-faint">{e.date}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
