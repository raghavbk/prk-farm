"use client";

import { useActionState } from "react";
import { createTenant, type ActionResult } from "@/actions/tenant";

export function CreateTenantForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createTenant,
    undefined
  );

  return (
    <form action={formAction} className="mt-8">
      <label
        htmlFor="name"
        className="block text-sm font-medium text-gray-700"
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
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {pending ? "Creating..." : "Create"}
        </button>
      </div>
      {state?.error && (
        <p className="mt-2 text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
