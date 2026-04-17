"use client";

import { useActionState, useState } from "react";
import { addExpense, type ExpenseActionResult } from "@/actions/expense";

type Props = {
  groupId: string;
  members: { userId: string; displayName: string }[];
  currentUserId: string;
};

export function ExpenseForm({ groupId, members, currentUserId }: Props) {
  const [splitMethod, setSplitMethod] = useState<"ownership" | "equal">("ownership");
  const [state, formAction, pending] = useActionState<ExpenseActionResult, FormData>(addExpense, undefined);

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="splitMethod" value={splitMethod} />

      <div>
        <label htmlFor="description" className="section-label mb-2 block">Description</label>
        <input type="text" id="description" name="description" required placeholder="e.g., Fertilizer purchase" className="input-warm" />
      </div>

      <div>
        <label htmlFor="amount" className="section-label mb-2 block">Amount (INR)</label>
        <input type="number" id="amount" name="amount" required min="0.01" step="0.01" placeholder="0.00" className="input-warm" />
      </div>

      <div>
        <label htmlFor="date" className="section-label mb-2 block">Date</label>
        <input type="date" id="date" name="date" required defaultValue={new Date().toISOString().split("T")[0]} className="input-warm" />
      </div>

      <div>
        <label htmlFor="paidBy" className="section-label mb-2 block">Paid by</label>
        <select id="paidBy" name="paidBy" required defaultValue={currentUserId} className="input-warm">
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>{m.displayName}</option>
          ))}
        </select>
      </div>

      {/* Split method toggle */}
      <div>
        <label className="section-label mb-3 block">Split method</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSplitMethod("ownership")}
            className={`rounded-xl px-4 py-3 text-[13px] font-medium text-center transition-all border ${
              splitMethod === "ownership"
                ? "border-primary bg-primary-wash text-primary"
                : "border-border bg-surface-warm text-ink-faint hover:text-ink-muted hover:border-border-strong"
            }`}
          >
            By ownership %
            <span className="block text-[11px] mt-0.5 opacity-60">
              Based on each member&apos;s stake
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSplitMethod("equal")}
            className={`rounded-xl px-4 py-3 text-[13px] font-medium text-center transition-all border ${
              splitMethod === "equal"
                ? "border-primary bg-primary-wash text-primary"
                : "border-border bg-surface-warm text-ink-faint hover:text-ink-muted hover:border-border-strong"
            }`}
          >
            Split equally
            <span className="block text-[11px] mt-0.5 opacity-60">
              Divide evenly among all
            </span>
          </button>
        </div>
      </div>

      {state?.error && (
        <div className="rounded-xl bg-danger-wash border border-danger/10 px-4 py-3 text-[13px] text-danger">{state.error}</div>
      )}

      <button type="submit" disabled={pending} className="w-full btn-primary btn-press">
        {pending ? "Adding..." : "Add Expense"}
      </button>
    </form>
  );
}
