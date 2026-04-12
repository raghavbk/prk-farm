"use client";

import { useActionState } from "react";
import { createTenant, type ActionResult } from "@/actions/tenant";

export function CreateTenantForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createTenant,
    undefined
  );

  return (
    <form action={formAction} className="mt-10">
      <label
        htmlFor="name"
        className="section-label"
      >
        Create a new farm
      </label>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          id="name"
          name="name"
          required
          placeholder="e.g., Mango Grove Farm"
          className="input-warm flex-1"
        />
        <button
          type="submit"
          disabled={pending}
          className="btn-primary btn-press"
        >
          {pending ? "Creating..." : "Create"}
        </button>
      </div>
      {state?.error && (
        <p className="mt-2 text-sm text-terra">{state.error}</p>
      )}
    </form>
  );
}
