"use client";

import { useRef, useState, useTransition } from "react";
import { revokeInvite } from "@/actions/admin";
import { ActionMenu } from "@/components/ui/action-menu";
import { I } from "@/components/ui/icons";

export type PendingInvite = {
  userId: string;
  email: string;
  displayName: string;
  role: "admin" | "member";
  invitedAt: string;
};

function humanAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const h = Math.round(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 14) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function InvitesTab({
  invites,
  onOpenInvite,
}: {
  invites: PendingInvite[];
  onOpenInvite: () => void;
}) {
  if (invites.length === 0) {
    return (
      <div
        className="rise"
        style={{
          padding: 48,
          textAlign: "center",
          background: "var(--card)",
          border: "1px dashed var(--rule)",
          borderRadius: 14,
        }}
      >
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            margin: "0 auto 14px",
            background: "var(--accent-wash)",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <I.plus size={22} />
        </div>
        <div className="serif" style={{ fontSize: 24, marginBottom: 6 }}>
          No invites out
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 20 }}>
          When you invite someone, they&rsquo;ll show up here until they accept.
        </div>
        <button type="button" onClick={onOpenInvite} className="btn btn-accent">
          <I.plus size={13} /> Invite someone
        </button>
      </div>
    );
  }

  return (
    <div
      className="rise"
      style={{
        background: "var(--card)",
        border: "1px solid var(--rule)",
        borderRadius: 14,
        // No overflow:hidden — the row ⋯ menu popover needs to escape
        // the card's rounded corners (same reason as members-tab).
      }}
    >
      <style>{`
        .it-grid {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          padding: 14px 16px;
          align-items: center;
        }
        .it-grid .it-role, .it-grid .it-sent { display: none; }
        @media (min-width: 768px) {
          .it-grid {
            grid-template-columns: 1fr 120px 120px 40px;
            gap: 16px;
            padding: 14px 18px;
          }
          .it-grid .it-role, .it-grid .it-sent { display: block; }
        }
      `}</style>
      <div
        className="it-grid"
        style={{
          borderBottom: "1px solid var(--rule)",
          background: "var(--surface-2)",
          padding: "12px 18px",
          borderTopLeftRadius: 13,
          borderTopRightRadius: 13,
        }}
      >
        <div className="eyebrow">Email</div>
        <div className="eyebrow it-role">Role</div>
        <div className="eyebrow it-sent">Invited</div>
        <div />
      </div>
      {invites.map((inv, i) => (
        <InviteRow
          key={inv.userId}
          invite={inv}
          isLast={i === invites.length - 1}
          idx={i}
        />
      ))}
    </div>
  );
}

function InviteRow({
  invite,
  isLast,
  idx,
}: {
  invite: PendingInvite;
  isLast: boolean;
  idx: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeMenu = () => {
    setMenuOpen(false);
    setConfirmRevoke(false);
  };

  const revoke = () => {
    startTransition(async () => {
      await revokeInvite(invite.userId);
      closeMenu();
    });
  };

  return (
    <div
      className="it-grid stagger"
      style={{
        ["--i" as string]: idx,
        borderBottom: isLast ? "none" : "1px solid var(--rule-2)",
        opacity: pending ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <span
          aria-hidden
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--surface-2)",
            color: "var(--ink-3)",
            border: "1px dashed var(--rule)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <I.user size={14} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {invite.email}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
            Pending · {humanAgo(invite.invitedAt)}
            {invite.displayName && invite.displayName !== invite.email ? ` · invited as ${invite.displayName}` : ""}
          </div>
        </div>
      </div>
      <div className="it-role">
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 10px",
            borderRadius: 999,
            background: invite.role === "admin" ? "var(--accent-wash)" : "var(--surface-2)",
            color: invite.role === "admin" ? "var(--accent)" : "var(--ink-2)",
            fontSize: 12,
            fontWeight: 500,
            opacity: 0.85,
          }}
        >
          <span
            aria-hidden
            style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }}
          />
          {invite.role === "admin" ? "Admin" : "Member"}
        </span>
      </div>
      <div className="it-sent" style={{ fontSize: 12, color: "var(--ink-3)" }}>
        {humanAgo(invite.invitedAt)}
      </div>

      <div style={{ justifySelf: "end" }}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={pending}
          title="More"
          aria-label="Invite actions"
          aria-expanded={menuOpen}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "none",
            cursor: pending ? "default" : "pointer",
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
        <ActionMenu open={menuOpen} onClose={closeMenu} anchorRef={triggerRef}>
          {confirmRevoke ? (
            <div style={{ padding: "6px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                Revoke invite for {invite.email}?
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={revoke}
                  disabled={pending}
                  className="btn btn-danger"
                  style={{ height: 30, padding: "0 10px", fontSize: 12 }}
                >
                  {pending ? "Revoking…" : "Revoke"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRevoke(false)}
                  className="btn btn-ghost"
                  style={{ height: 30, padding: "0 10px", fontSize: 12 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => setConfirmRevoke(true)}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 10px",
                fontSize: 13,
                textAlign: "left",
                background: "transparent",
                border: "none",
                borderRadius: 8,
                color: "var(--neg)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--neg-wash)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Revoke invite
            </button>
          )}
        </ActionMenu>
      </div>
    </div>
  );
}
