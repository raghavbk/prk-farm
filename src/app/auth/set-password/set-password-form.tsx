"use client";

import { useActionState } from "react";
import { setPassword, type AuthActionResult } from "@/actions/auth";

export function SetPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthActionResult, FormData>(setPassword, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="password" className="section-label mb-2 block">New Password</label>
        <input
          type="password"
          id="password"
          name="password"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="At least 6 characters"
          className="input-warm"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="section-label mb-2 block">Confirm Password</label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="Type it again"
          className="input-warm"
        />
      </div>

      {state?.error && (
        <div className="rounded-xl bg-danger-wash border border-danger/10 px-4 py-3 text-[13px] text-danger">{state.error}</div>
      )}

      <button type="submit" disabled={pending} className="w-full btn-primary btn-press">
        {pending ? "Setting password..." : "Set password & continue"}
      </button>
    </form>
  );
}
