"use client";

import { useActionState } from "react";
import { login, type AuthActionResult } from "@/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<
    AuthActionResult,
    FormData
  >(login, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="section-label">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="mt-1 w-full input-warm"
        />
      </div>

      <div>
        <label htmlFor="password" className="section-label">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="Your password"
          className="mt-1 w-full input-warm"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-terra">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full btn-primary btn-press"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
