"use client";

import { useActionState } from "react";
import {
  editExpense,
  deleteExpenseAction,
  type ExpenseActionResult,
} from "@/actions/expense";

type Props = {
  expense: {
    id: string;
    description: string;
    amount: number;
    date: string;
    paid_by: string;
  };
  groupId: string;
  members: { userId: string; displayName: string }[];
};

export function EditExpenseForm({ expense, groupId, members }: Props) {
  const [state, formAction, pending] = useActionState<
    ExpenseActionResult,
    FormData
  >(editExpense, undefined);

  return (
    <div className="mt-6 space-y-6">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="expenseId" value={expense.id} />

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <input
            type="text"
            id="description"
            name="description"
            required
            defaultValue={expense.description}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>

        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-gray-700"
          >
            Amount (INR)
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            required
            min="0.01"
            step="0.01"
            defaultValue={expense.amount}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>

        <div>
          <label
            htmlFor="date"
            className="block text-sm font-medium text-gray-700"
          >
            Date
          </label>
          <input
            type="date"
            id="date"
            name="date"
            required
            defaultValue={expense.date}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>

        <div>
          <label
            htmlFor="paidBy"
            className="block text-sm font-medium text-gray-700"
          >
            Paid by
          </label>
          <select
            id="paidBy"
            name="paidBy"
            required
            defaultValue={expense.paid_by}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.displayName}
              </option>
            ))}
          </select>
        </div>

        {state?.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {pending ? "Saving..." : "Update Expense"}
        </button>
      </form>

      <form action={deleteExpenseAction}>
        <input type="hidden" name="expenseId" value={expense.id} />
        <input type="hidden" name="groupId" value={groupId} />
        <button
          type="submit"
          className="w-full rounded-lg border border-red-300 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          Delete Expense
        </button>
      </form>
    </div>
  );
}
