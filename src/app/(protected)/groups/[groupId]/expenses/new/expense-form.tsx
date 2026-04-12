"use client";

import { useActionState } from "react";
import { addExpense, type ExpenseActionResult } from "@/actions/expense";

type Props = {
  groupId: string;
  members: { userId: string; displayName: string }[];
  currentUserId: string;
};

export function ExpenseForm({ groupId, members, currentUserId }: Props) {
  const [state, formAction, pending] = useActionState<
    ExpenseActionResult,
    FormData
  >(addExpense, undefined);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="groupId" value={groupId} />

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
          placeholder="e.g., Fertilizer purchase"
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
          placeholder="0.00"
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
          defaultValue={new Date().toISOString().split("T")[0]}
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
          defaultValue={currentUserId}
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
        {pending ? "Adding..." : "Add Expense"}
      </button>
    </form>
  );
}
