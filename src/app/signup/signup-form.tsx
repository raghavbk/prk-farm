"use client";

import { useActionState } from "react";
import { signup, type AuthActionResult } from "@/actions/auth";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<AuthActionResult, FormData>(signup, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="displayName" className="section-label mb-2 block">Full name</label>
        <input type="text" id="displayName" name="displayName" required autoComplete="name" placeholder="Your name" className="input-warm" />
      </div>
      <div>
        <label htmlFor="email" className="section-label mb-2 block">Email</label>
        <input type="email" id="email" name="email" required autoComplete="email" placeholder="you@example.com" className="input-warm" />
      </div>
      <div>
        <label htmlFor="password" className="section-label mb-2 block">Password</label>
        <input type="password" id="password" name="password" required autoComplete="new-password" minLength={6} placeholder="At least 6 characters" className="input-warm" />
      </div>
      {state?.error && (
        <div className="rounded-xl bg-danger-wash border border-danger/10 px-4 py-3 text-sm text-danger">{state.error}</div>
      )}
      <button type="submit" disabled={pending} className="w-full btn-primary btn-press">
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
