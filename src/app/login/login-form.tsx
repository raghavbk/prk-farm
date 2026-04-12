"use client";

import { useActionState } from "react";
import { login, type AuthActionResult } from "@/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthActionResult, FormData>(login, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="Your password"
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      {state?.error && (
        <div className="rounded-lg bg-danger/10 border border-danger/20 px-3 py-2 text-sm text-danger">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full btn-primary btn-press mt-2"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
