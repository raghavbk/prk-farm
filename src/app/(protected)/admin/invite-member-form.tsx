"use client";

import { useActionState } from "react";
import { inviteMember, type AdminActionResult } from "@/actions/admin";

export function InviteMemberForm() {
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(inviteMember, undefined);

  return (
    <form action={formAction}>
      <p className="text-[13px] text-ink-faint mb-4">
        Add someone to your farm by their email. They must have an account already.
      </p>
      {/* Stacks on mobile, row on sm+ */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input type="email" name="email" required placeholder="Email address" className="input-warm sm:flex-1" />
        <div className="flex gap-3">
          <select name="role" className="input-warm flex-1 sm:flex-none sm:w-28">
            <option value="member">Member</option>
            <option value="owner">Admin</option>
          </select>
          <button type="submit" disabled={pending} className="btn-primary btn-press whitespace-nowrap flex-1 sm:flex-none">
            {pending ? "Adding..." : "Invite"}
          </button>
        </div>
      </div>
      {state?.error && (
        <div className="mt-3 rounded-xl bg-danger-wash border border-danger/10 px-4 py-3 text-[13px] text-danger">{state.error}</div>
      )}
      {state?.success && (
        <div className="mt-3 rounded-xl bg-success-wash border border-success/10 px-4 py-3 text-[13px] text-success">{state.success}</div>
      )}
    </form>
  );
}
