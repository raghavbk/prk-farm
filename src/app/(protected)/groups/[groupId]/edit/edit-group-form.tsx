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
            className="block text-sm font-medium text-ink-muted"
          >
            Group name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            defaultValue={groupName}
            className="mt-1 w-full input-warm"
          />
        </div>
        {nameState?.error && (
          <p className="text-sm text-terra">{nameState.error}</p>
        )}
        <button
          type="submit"
          disabled={namePending}
          className="btn btn-primary btn-press"
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
          <p className="text-sm text-terra">{ownerState.error}</p>
        )}
        <button
          type="submit"
          disabled={ownerPending || !isOwnershipValid}
          className="btn btn-primary btn-press w-full"
        >
          {ownerPending ? "Saving..." : "Update Members & Ownership"}
        </button>
      </form>
    </div>
  );
}
