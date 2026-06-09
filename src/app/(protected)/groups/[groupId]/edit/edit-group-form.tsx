"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateGroup, type GroupActionResult } from "@/actions/group";

type Props = {
  groupId: string;
  groupName: string;
};

export function EditGroupForm({ groupId, groupName }: Props) {
  const [state, formAction, pending] = useActionState<
    GroupActionResult,
    FormData
  >(updateGroup, undefined);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form action={formAction} className="card-surface p-5 sm:p-6">
        <input type="hidden" name="groupId" value={groupId} />

        <div className="border-b border-rule pb-5">
          <p className="eyebrow mb-2">Basic details</p>
          <h2 className="m-0 text-lg font-semibold text-ink">Group identity</h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            This name appears on the dashboard, group list, balances, and expense views.
          </p>
        </div>

        <div className="pt-5">
          <label htmlFor="name" className="section-label">
            Group name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            defaultValue={groupName}
            className="mt-2 input-warm"
          />
        </div>

        {state?.error && (
          <p className="mt-4 text-sm text-terra">{state.error}</p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link href={`/groups/${groupId}`} className="btn btn-ghost justify-center">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary btn-press justify-center"
          >
            {pending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>

      <aside className="card-surface p-5 sm:p-6">
        <p className="eyebrow mb-2">Coming later</p>
        <h2 className="m-0 text-base font-semibold text-ink">Group settings</h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          This page is ready for status, description, default split method, archive controls, and other group-level options.
        </p>
      </aside>
    </div>
  );
}
