"use client";

import { useActionState } from "react";
import { signup, type AuthActionResult } from "@/actions/auth";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<
    AuthActionResult,
    FormData
  >(signup, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="displayName" className="section-label">
          Full name
        </label>
        <input
          type="text"
          id="displayName"
          name="displayName"
          required
          autoComplete="name"
          placeholder="Your name"
          className="mt-1 w-full input-warm"
        />
      </div>

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
          autoComplete="new-password"
          minLength={6}
          placeholder="At least 6 characters"
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
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
