"use client";

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
        overflow: "hidden",
      }}
    >
      <style>{`
        .it-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          padding: 14px 16px;
          align-items: center;
        }
        .it-grid .it-role, .it-grid .it-sent { display: none; }
        @media (min-width: 768px) {
          .it-grid {
            grid-template-columns: 1fr 120px 120px;
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
        }}
      >
        <div className="eyebrow">Email</div>
        <div className="eyebrow it-role">Role</div>
        <div className="eyebrow it-sent">Invited</div>
      </div>
      {invites.map((inv, i) => (
        <div
          key={inv.userId}
          className="it-grid stagger"
          style={{
            ["--i" as string]: i,
            borderBottom: i === invites.length - 1 ? "none" : "1px solid var(--rule-2)",
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
                {inv.email}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                Pending · {humanAgo(inv.invitedAt)}
                {inv.displayName && inv.displayName !== inv.email ? ` · invited as ${inv.displayName}` : ""}
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
                background: inv.role === "admin" ? "var(--accent-wash)" : "var(--surface-2)",
                color: inv.role === "admin" ? "var(--accent)" : "var(--ink-2)",
                fontSize: 12,
                fontWeight: 500,
                opacity: 0.85,
              }}
            >
              <span
                aria-hidden
                style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }}
              />
              {inv.role === "admin" ? "Admin" : "Member"}
            </span>
          </div>
          <div className="it-sent" style={{ fontSize: 12, color: "var(--ink-3)" }}>
            {humanAgo(inv.invitedAt)}
          </div>
        </div>
      ))}
    </div>
  );
}
