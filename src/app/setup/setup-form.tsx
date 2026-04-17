"use client";

import { useActionState } from "react";
import { setupAdmin, type SetupActionResult } from "@/actions/setup";

export function SetupForm() {
  const [state, formAction, pending] = useActionState<SetupActionResult, FormData>(setupAdmin, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="name" className="section-label mb-2 block">Your Name</label>
        <input type="text" id="name" name="name" required autoComplete="name" placeholder="Full name" className="input-warm" />
      </div>

      <div>
        <label htmlFor="email" className="section-label mb-2 block">Email</label>
        <input type="email" id="email" name="email" required autoComplete="email" placeholder="you@example.com" className="input-warm" />
      </div>

      <div>
        <label htmlFor="password" className="section-label mb-2 block">Password</label>
        <input type="password" id="password" name="password" required minLength={6} autoComplete="new-password" placeholder="At least 6 characters" className="input-warm" />
      </div>

      <div className="pt-2">
        <label htmlFor="farmName" className="section-label mb-2 block">Farm Name</label>
        <input type="text" id="farmName" name="farmName" required placeholder="e.g., Green Acres Farm" className="input-warm" />
        <p className="mt-2 text-[12px] text-ink-faint">This creates your first farm. You can add more later.</p>
      </div>

      {state?.error && (
        <div className="rounded-xl bg-danger-wash border border-danger/10 px-4 py-3 text-[13px] text-danger">{state.error}</div>
      )}

      <button type="submit" disabled={pending} className="w-full btn-primary btn-press">
        {pending ? "Setting up..." : "Create account & farm"}
      </button>
    </form>
  );
}
