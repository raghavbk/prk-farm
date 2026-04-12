"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type MemberWithOwnership = {
  userId: string;
  email: string;
  displayName: string;
  ownershipPct: number;
};

type Props = {
  members: MemberWithOwnership[];
  onChange: (members: MemberWithOwnership[]) => void;
};

export function MemberSearch({ members, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);

  const searchProfiles = useCallback(
    async (email: string) => {
      if (email.length < 3) {
        setResults([]);
        setNoResults(false);
        return;
      }

      setSearching(true);
      setNoResults(false);
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, email, avatar_url, created_at")
        .ilike("email", `%${email}%`)
        .limit(5);

      const filtered =
        data?.filter((p) => !members.some((m) => m.userId === p.id)) ?? [];
      setResults(filtered);
      setNoResults(filtered.length === 0);
      setSearching(false);
    },
    [members]
  );

  // Debounced search
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(
    null
  );
  function handleQueryChange(value: string) {
    setQuery(value);
    if (timer) clearTimeout(timer);
    setTimer(setTimeout(() => searchProfiles(value), 300));
  }

  function addMember(profile: Profile) {
    onChange([
      ...members,
      {
        userId: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        ownershipPct: 0,
      },
    ]);
    setQuery("");
    setResults([]);
    setNoResults(false);
  }

  function removeMember(userId: string) {
    onChange(members.filter((m) => m.userId !== userId));
  }

  return (
    <div>
      <label className="block text-sm font-medium text-ink-muted">
        Add members by email
      </label>
      <div className="relative mt-1">
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search by email..."
          className="w-full input-warm"
        />
        {(results.length > 0 || searching || noResults) && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-surface-raised shadow-lg dropdown-enter">
            {searching && (
              <div className="px-3 py-2 text-sm text-ink-faint">
                Searching...
              </div>
            )}
            {noResults && !searching && (
              <div className="px-3 py-2 text-sm text-ink-faint">
                No user found for that email
              </div>
            )}
            {results.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => addMember(profile)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface-warm"
              >
                <span className="font-medium">{profile.display_name}</span>
                <span className="ml-2 text-ink-faint">{profile.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {members.length > 0 && (
        <ul className="mt-3 space-y-2">
          {members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">
                  {m.displayName}
                </p>
                <p className="text-xs text-ink-faint truncate">{m.email}</p>
              </div>
              <button
                type="button"
                onClick={() => removeMember(m.userId)}
                className="text-ink-faint hover:text-danger text-sm"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
