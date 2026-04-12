"use client";

import { removeMember, updateMemberRole } from "@/actions/admin";

type Member = {
  userId: string;
  role: "owner" | "member";
  joinedAt: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const avatarColors = [
  "bg-primary text-white",
  "bg-success text-white",
  "bg-warning text-white",
  "bg-danger text-white",
  "bg-currency text-white",
];

export function MemberList({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  return (
    <div className="card-surface divide-y divide-border overflow-hidden">
      {members.map((m, i) => (
        <div key={m.userId} className="flex items-center gap-3 px-4 py-3">
          {/* Avatar */}
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColors[i % avatarColors.length]}`}
          >
            {getInitials(m.displayName)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-ink truncate">
                {m.displayName}
              </p>
              {m.userId === currentUserId && (
                <span className="badge badge-primary">You</span>
              )}
              <span
                className={`badge ${
                  m.role === "owner" ? "badge-warning" : "badge-primary"
                }`}
              >
                {m.role === "owner" ? "Admin" : "Member"}
              </span>
            </div>
            <p className="text-xs text-ink-faint truncate">{m.email}</p>
          </div>

          {/* Actions */}
          {m.userId !== currentUserId && (
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  updateMemberRole(
                    m.userId,
                    m.role === "owner" ? "member" : "owner"
                  )
                }
                className="rounded-lg px-2 py-1 text-xs font-medium text-ink-muted hover:text-primary hover:bg-primary-wash transition-colors"
              >
                {m.role === "owner" ? "Demote" : "Promote"}
              </button>
              <button
                onClick={() => {
                  if (confirm(`Remove ${m.displayName} from this farm?`)) {
                    removeMember(m.userId);
                  }
                }}
                className="rounded-lg px-2 py-1 text-xs font-medium text-ink-faint hover:text-danger hover:bg-danger-wash transition-colors"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
