"use client";

import { useState } from "react";
import { removeMember, updateMemberRole } from "@/actions/admin";
import { Avatar } from "@/components/ui/avatar";
import { I } from "@/components/ui/icons";

export type AdminMember = {
  userId: string;
  role: "owner" | "member";
  joinedAt: string;
  displayName: string;
  email: string;
};

function humanJoined(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const h = Math.round(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 14) return `${d}d ago`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.round(d / 30);
  return `${mo}mo ago`;
}

export function MembersTab({
  members,
  currentUserId,
}: {
  members: AdminMember[];
  currentUserId: string;
}) {
  return (
    <div
      className="rise"
      style={{
        background: "var(--card)",
        border: "1px solid var(--rule)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <style>{`
        .mt-grid {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: center;
          padding: 14px 16px;
        }
        .mt-grid .mt-role, .mt-grid .mt-active { display: none; }
        @media (min-width: 768px) {
          .mt-grid {
            grid-template-columns: 1fr 140px 140px 40px;
            gap: 16px;
            padding: 14px 18px;
          }
          .mt-grid .mt-role, .mt-grid .mt-active { display: block; }
          .mt-grid .mt-mobile-role { display: none; }
        }
      `}</style>
      {/* Table header (desktop) */}
      <div
        className="mt-grid"
        style={{
          borderBottom: "1px solid var(--rule)",
          background: "var(--surface-2)",
          padding: "12px 18px",
        }}
      >
        <div className="eyebrow">Member</div>
        <div className="eyebrow mt-role">Role</div>
        <div className="eyebrow mt-active">Joined</div>
        <div />
      </div>

      {members.map((m, i) => (
        <MemberRow
          key={m.userId}
          member={m}
          isMe={m.userId === currentUserId}
          isLast={i === members.length - 1}
          idx={i}
        />
      ))}
    </div>
  );
}

function MemberRow({
  member,
  isMe,
  isLast,
  idx,
}: {
  member: AdminMember;
  isMe: boolean;
  isLast: boolean;
  idx: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const hideMenu = isMe;
  const roleLabel = member.role === "owner" ? "Owner" : "Member";
  const joined = humanJoined(member.joinedAt);

  return (
    <div
      className="mt-grid stagger"
      style={{
        ["--i" as string]: idx,
        borderBottom: isLast ? "none" : "1px solid var(--rule-2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <Avatar id={member.userId} name={member.displayName} size={36} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
                color: "var(--ink)",
              }}
            >
              {member.displayName}
            </span>
            {isMe && (
              <span
                className="mono"
                style={{
                  fontSize: 9,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "var(--accent-wash)",
                  color: "var(--accent)",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                }}
              >
                YOU
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-3)",
              marginTop: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {member.email}
          </div>
          <div
            className="mt-mobile-role"
            style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}
          >
            {roleLabel} · joined {joined}
          </div>
        </div>
      </div>

      <div className="mt-role">
        <RolePill role={member.role} disabled={isMe} />
      </div>
      <div className="mt-active" style={{ fontSize: 12, color: "var(--ink-3)" }}>
        {joined}
      </div>

      <div style={{ position: "relative", justifySelf: "end" }}>
        {!hideMenu && (
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            title="More"
            aria-label="Member actions"
            aria-expanded={menuOpen}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: "transparent",
              color: "var(--ink-3)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <I.dots size={16} />
          </button>
        )}
        {menuOpen && (
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              minWidth: 200,
              background: "var(--card)",
              border: "1px solid var(--rule)",
              borderRadius: 12,
              boxShadow: "var(--shadow-md)",
              padding: 6,
              zIndex: 10,
            }}
          >
            <MenuItem
              label={member.role === "owner" ? "Demote to member" : "Make owner"}
              onClick={() => {
                setMenuOpen(false);
                updateMemberRole(
                  member.userId,
                  member.role === "owner" ? "member" : "owner",
                );
              }}
            />
            {confirmRemove ? (
              <div style={{ padding: "6px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                  Remove {member.displayName.split(" ")[0]}?
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmRemove(false);
                      removeMember(member.userId);
                    }}
                    className="btn btn-danger"
                    style={{ height: 30, padding: "0 10px", fontSize: 12 }}
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(false)}
                    className="btn btn-ghost"
                    style={{ height: 30, padding: "0 10px", fontSize: 12 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <MenuItem
                label="Remove from tenant"
                tone="danger"
                onClick={() => setConfirmRemove(true)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RolePill({ role, disabled }: { role: "owner" | "member"; disabled: boolean }) {
  const c =
    role === "owner"
      ? { bg: "var(--accent-wash)", fg: "var(--accent)" }
      : { bg: "var(--surface-2)", fg: "var(--ink-2)" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
        fontSize: 12,
        fontWeight: 500,
        opacity: disabled ? 0.7 : 1,
        cursor: disabled ? "default" : "pointer",
        border: "1px solid transparent",
      }}
    >
      <span
        aria-hidden
        style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }}
      />
      {role === "owner" ? "Owner" : "Member"}
    </span>
  );
}

function MenuItem({
  label,
  onClick,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        padding: "8px 10px",
        fontSize: 13,
        textAlign: "left",
        background: "transparent",
        border: "none",
        borderRadius: 8,
        color: tone === "danger" ? "var(--neg)" : "var(--ink)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = tone === "danger" ? "var(--neg-wash)" : "var(--surface-2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {label}
    </button>
  );
}
