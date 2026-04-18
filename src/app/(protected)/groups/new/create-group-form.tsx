"use client";

import { useActionState, useState } from "react";
import { createGroup, type GroupActionResult } from "@/actions/group";
import { MemberSearch } from "@/components/member-search";
import { OwnershipEditor } from "@/components/ownership-editor";

type Member = {
  userId: string;
  email: string;
  displayName: string;
  ownershipPct: number;
};

export function CreateGroupForm({ currentUserId }: { currentUserId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [state, formAction, pending] = useActionState<
    GroupActionResult,
    FormData
  >(createGroup, undefined);

  const total = members.reduce((sum, m) => sum + m.ownershipPct, 0);
  const isValid = members.length > 0 && Math.abs(total - 100) < 0.01;

  // Filter out current user from being added twice (they can add themselves via search)
  const _ = currentUserId; // available for future use

  return (
    <form action={formAction} className="mt-6 space-y-6">
      <div>
        <label htmlFor="name" className="section-label">
          Group name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          placeholder="e.g., Crop Season 2026"
          className="mt-1 w-full input-warm"
        />
      </div>

      <MemberSearch members={members} onChange={setMembers} />

      <OwnershipEditor members={members} onChange={setMembers} />

      {/* Hidden input carries member data to server action */}
      <input
        type="hidden"
        name="members"
        value={JSON.stringify(
          members.map((m) => ({
            userId: m.userId,
            ownershipPct: m.ownershipPct,
          }))
        )}
      />

      {state?.error && (
        <p className="text-sm text-terra">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending || !isValid}
        className="btn btn-primary btn-press w-full"
      >
        {pending ? "Creating..." : "Create Group"}
      </button>
    </form>
  );
}
