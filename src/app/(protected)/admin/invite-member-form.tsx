"use client";

import { useActionState } from "react";
import { inviteMember, type AdminActionResult } from "@/actions/admin";

export function InviteMemberForm() {
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(inviteMember, undefined);

  return (
    <form action={formAction}>
      <p className="text-[13px] text-ink-faint mb-4">
        Invite someone by email. If they don&apos;t have an account, one will be created for them.
      </p>
      <div className="space-y-3">
        <div className="flex gap-3 items-stretch">
          <input type="email" name="email" required placeholder="Email address" className="input-warm min-w-0 flex-[3]" />
          <input type="text" name="displayName" placeholder="Name (for new users)" className="input-warm min-w-0 flex-[2]" />
        </div>
        <div className="flex gap-3">
          <select name="role" className="input-warm flex-1">
            <option value="member">Member</option>
            <option value="owner">Admin</option>
          </select>
          <button type="submit" disabled={pending} className="btn btn-accent btn-press flex-1">
            {pending ? "Inviting..." : "Invite"}
          </button>
        </div>
      </div>
      {state?.error && (
        <div className="mt-3 rounded-xl bg-danger-wash border border-danger/10 px-4 py-3 text-[13px] text-danger">{state.error}</div>
      )}
      {state?.success && (
        <div className="mt-3 rounded-xl bg-success-wash border border-success/10 px-4 py-3 text-[13px] text-success whitespace-pre-wrap">{state.success}</div>
      )}
    </form>
  );
}
