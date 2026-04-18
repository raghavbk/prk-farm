"use client";

import { useActionState } from "react";
import { createTenant, type ActionResult } from "@/actions/tenant";

export function CreateTenantForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createTenant, undefined);

  return (
    <form action={formAction} className="mt-10">
      <label htmlFor="name" className="section-label">Create a new farm</label>
      <div className="mt-3 flex flex-col sm:flex-row gap-3">
        <input type="text" id="name" name="name" required placeholder="e.g., Mango Grove Farm" className="input-warm sm:flex-1" />
        <button type="submit" disabled={pending} className="btn btn-primary btn-press whitespace-nowrap">
          {pending ? "Creating..." : "Create"}
        </button>
      </div>
      {state?.error && (
        <div className="mt-3 rounded-xl bg-danger-wash border border-danger/10 px-4 py-3 text-[13px] text-danger">{state.error}</div>
      )}
    </form>
  );
}
