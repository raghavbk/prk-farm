"use client";

import { useState } from "react";
import { InviteDialog } from "./invite-dialog";
import { MembersTab, type AdminMember } from "./members-tab";
import { InvitesTab, type PendingInvite } from "./invites-tab";
import { SettingsTab } from "./settings-tab";
import { I } from "@/components/ui/icons";

type TabId = "members" | "invites" | "settings";

type Props = {
  tenantName: string;
  members: AdminMember[];
  pendingInvites: PendingInvite[];
  currentUserId: string;
};

export function AdminShell({ tenantName, members, pendingInvites, currentUserId }: Props) {
  const [tab, setTab] = useState<TabId>("members");
  const [inviteOpen, setInviteOpen] = useState(false);

  const tabs: { id: TabId; label: string; count?: number; hi?: boolean }[] = [
    { id: "members", label: "Members", count: members.length },
    { id: "invites", label: "Invites", count: pendingInvites.length, hi: pendingInvites.length > 0 },
    { id: "settings", label: "Settings" },
  ];

  return (
    <>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Tenant administration
          </div>
          <h1
            className="serif"
            style={{
              fontSize: "clamp(28px, 5vw, 44px)",
              margin: 0,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: "var(--ink)",
            }}
          >
            Who belongs to <em style={{ color: "var(--accent)" }}>{tenantName}</em>.
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="btn btn-accent"
          style={{ height: 42, padding: "0 18px", flexShrink: 0, whiteSpace: "nowrap" }}
        >
          <I.plus size={14} /> Invite people
        </button>
      </div>
      <p
        style={{
          fontSize: 14,
          color: "var(--ink-3)",
          margin: "12px 0 28px",
          maxWidth: 520,
          lineHeight: 1.55,
        }}
      >
        Only Owners and Admins can manage who has access. Invites expire after 7 days.
      </p>

      {/* Segmented tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: 4,
          borderRadius: 10,
          background: "var(--surface-2)",
          marginBottom: 20,
          width: "fit-content",
        }}
        role="tablist"
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              role="tab"
              aria-selected={active}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 14px",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                background: active ? "var(--card)" : "transparent",
                color: active ? "var(--ink)" : "var(--ink-3)",
                fontSize: 12.5,
                fontWeight: 500,
                boxShadow: active ? "var(--shadow-sm)" : "none",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {t.label}
              {t.count != null && (
                <span
                  className="mono"
                  style={{
                    fontSize: 10,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: t.hi ? "var(--accent)" : "var(--rule)",
                    color: t.hi ? "var(--accent-ink)" : "var(--ink-3)",
                    fontWeight: 600,
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "members" && <MembersTab members={members} currentUserId={currentUserId} />}
      {tab === "invites" && (
        <InvitesTab invites={pendingInvites} onOpenInvite={() => setInviteOpen(true)} />
      )}
      {tab === "settings" && <SettingsTab tenantName={tenantName} />}

      {inviteOpen && (
        <InviteDialog
          tenantName={tenantName}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </>
  );
}
