"use client";

import { useActionState } from "react";
import { inviteMember, type AdminActionResult } from "@/actions/admin";

export function InviteMemberForm() {
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(
    inviteMember,
    undefined
  );

  return (
    <form action={formAction}>
      <p className="text-sm text-ink-muted mb-4">
        Add someone to your farm by their email. They must have an account already.
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="Email address"
          className="input-warm flex-1"
        />
        <select
          name="role"
          className="input-warm w-28"
        >
          <option value="member">Member</option>
          <option value="owner">Admin</option>
        </select>
        <button type="submit" disabled={pending} className="btn-primary btn-press whitespace-nowrap">
          {pending ? "Adding..." : "Invite"}
        </button>
      </div>
      {state?.error && (
        <div className="mt-3 rounded-lg bg-danger-wash border border-danger/20 px-3 py-2 text-sm text-danger">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="mt-3 rounded-lg bg-success-wash border border-success/20 px-3 py-2 text-sm text-success">
          {state.success}
        </div>
      )}
    </form>
  );
}
