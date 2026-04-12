import { formatINR } from "@/lib/format";
import Link from "next/link";

type RecentExpense = {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  date: string;
  paidByName: string;
  groupName: string;
};

type Props = {
  expenses: RecentExpense[];
};

export function RecentExpenses({ expenses }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border py-8 text-center">
        <p className="text-sm text-ink-faint">No expenses recorded yet</p>
      </div>
    );
  }

  return (
    <div className="card-surface divide-y divide-border overflow-hidden">
      {expenses.map((e) => (
        <Link
          key={e.id}
          href={`/groups/${e.group_id}`}
          transitionTypes={["nav-forward"]}
          className="flex items-start justify-between px-4 py-3 hover:bg-surface-warm transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink truncate">
              {e.description}
            </p>
            <p className="mt-0.5 text-xs text-ink-faint">
              {e.paidByName} &middot; {e.groupName} &middot; {e.date}
            </p>
          </div>
          <span className="ml-3 font-display text-sm font-semibold text-amber shrink-0">
            {formatINR(e.amount)}
          </span>
        </Link>
      ))}
    </div>
  );
}
