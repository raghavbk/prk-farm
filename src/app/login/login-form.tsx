"use client";

import { useActionState } from "react";
import { login, type AuthActionResult } from "@/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthActionResult, FormData>(login, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="email" className="section-label mb-2 block">Email</label>
        <input type="email" id="email" name="email" required autoComplete="email" placeholder="you@example.com" className="input-warm" />
      </div>
      <div>
        <label htmlFor="password" className="section-label mb-2 block">Password</label>
        <input type="password" id="password" name="password" required autoComplete="current-password" placeholder="Your password" className="input-warm" />
      </div>
      {state?.error && (
        <div className="rounded-xl bg-danger-wash border border-danger/10 px-4 py-3 text-sm text-danger">{state.error}</div>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary btn-press w-full">
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
