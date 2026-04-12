"use client";

import { useActionState, useState } from "react";
import {
  updateGroup,
  setOwnership,
  type GroupActionResult,
} from "@/actions/group";
import { MemberSearch } from "@/components/member-search";
import { OwnershipEditor } from "@/components/ownership-editor";

type Member = {
  userId: string;
  email: string;
  displayName: string;
  ownershipPct: number;
};

export function EditGroupForm({
  groupId,
  groupName,
  existingMembers,
}: {
  groupId: string;
  groupName: string;
  existingMembers: Member[];
}) {
  const [members, setMembers] = useState<Member[]>(existingMembers);

  const [nameState, nameAction, namePending] = useActionState<
    GroupActionResult,
    FormData
  >(updateGroup, undefined);

  const [ownerState, ownerAction, ownerPending] = useActionState<
    GroupActionResult,
    FormData
  >(setOwnership, undefined);

  const total = members.reduce((sum, m) => sum + m.ownershipPct, 0);
  const isOwnershipValid = members.length > 0 && Math.abs(total - 100) < 0.01;

  return (
    <div className="mt-6 space-y-8">
      {/* Name edit */}
      <form action={nameAction} className="space-y-3">
        <input type="hidden" name="groupId" value={groupId} />
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Group name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            defaultValue={groupName}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
        {nameState?.error && (
          <p className="text-sm text-red-600">{nameState.error}</p>
        )}
        <button
          type="submit"
          disabled={namePending}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {namePending ? "Saving..." : "Update Name"}
        </button>
      </form>

      {/* Membership & ownership edit */}
      <form action={ownerAction} className="space-y-6">
        <input type="hidden" name="groupId" value={groupId} />
        <input
          type="hidden"
          name="allocations"
          value={JSON.stringify(
            members.map((m) => ({ userId: m.userId, pct: m.ownershipPct }))
          )}
        />

        <MemberSearch members={members} onChange={setMembers} />
        <OwnershipEditor members={members} onChange={setMembers} />

        {ownerState?.error && (
          <p className="text-sm text-red-600">{ownerState.error}</p>
        )}
        <button
          type="submit"
          disabled={ownerPending || !isOwnershipValid}
          className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {ownerPending ? "Saving..." : "Update Members & Ownership"}
        </button>
      </form>
    </div>
  );
}
