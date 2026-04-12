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
    return <p className="text-sm text-gray-400">No expenses yet</p>;
  }

  return (
    <ul className="divide-y divide-gray-100">
      {expenses.map((e) => (
        <li key={e.id} className="py-3">
          <Link
            href={`/groups/${e.group_id}`}
            className="flex items-start justify-between hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {e.description}
              </p>
              <p className="text-xs text-gray-500">
                {e.paidByName} &middot; {e.groupName} &middot; {e.date}
              </p>
            </div>
            <span className="ml-3 text-sm font-bold text-gray-900 shrink-0">
              {formatINR(e.amount)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
