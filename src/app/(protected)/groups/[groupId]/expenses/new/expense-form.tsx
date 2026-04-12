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
          className="block text-sm font-medium text-ink-muted"
        >
          Description
        </label>
        <input
          type="text"
          id="description"
          name="description"
          required
          placeholder="e.g., Fertilizer purchase"
          className="mt-1 w-full input-warm"
        />
      </div>

      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-ink-muted"
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
          className="mt-1 w-full input-warm"
        />
      </div>

      <div>
        <label
          htmlFor="date"
          className="block text-sm font-medium text-ink-muted"
        >
          Date
        </label>
        <input
          type="date"
          id="date"
          name="date"
          required
          defaultValue={new Date().toISOString().split("T")[0]}
          className="mt-1 w-full input-warm"
        />
      </div>

      <div>
        <label
          htmlFor="paidBy"
          className="block text-sm font-medium text-ink-muted"
        >
          Paid by
        </label>
        <select
          id="paidBy"
          name="paidBy"
          required
          defaultValue={currentUserId}
          className="mt-1 w-full input-warm"
        >
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.displayName}
            </option>
          ))}
        </select>
      </div>

      {state?.error && (
        <p className="text-sm text-terra">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full btn-primary btn-press"
      >
        {pending ? "Adding..." : "Add Expense"}
      </button>
    </form>
  );
}
