"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { inviteMember, type AdminActionResult } from "@/actions/admin";
import { I } from "@/components/ui/icons";

export function InviteDialog({
  tenantName,
  onClose,
}: {
  tenantName: string;
  onClose: () => void;
}) {
  const [role, setRole] = useState<"member" | "admin">("member");
  const [state, formAction, pending] = useActionState<AdminActionResult, FormData>(
    inviteMember,
    undefined,
  );
  const firstInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => firstInput.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Close on success (pending user added). Small delay so user sees confirmation.
  useEffect(() => {
    if (state?.success) {
      const t = window.setTimeout(() => onClose(), 1200);
      return () => window.clearTimeout(t);
    }
  }, [state?.success, onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "oklch(0 0 0 / 0.5)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(0px, 2vw, 20px)",
        animation: "fadeSlideIn 0.25s cubic-bezier(0.2,0.7,0.2,1) both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
        className="pop"
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "88vh",
          overflow: "auto",
          background: "var(--card)",
          borderRadius: 16,
          border: "1px solid var(--rule)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "22px 24px 16px",
            borderBottom: "1px solid var(--rule-2)",
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "var(--accent-wash)",
              color: "var(--accent)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <I.users size={18} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              id="invite-title"
              className="serif"
              style={{ fontSize: 24, lineHeight: 1.15, letterSpacing: "-0.015em" }}
            >
              Invite to <em>{tenantName}</em>
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: "var(--ink-3)",
                marginTop: 4,
                lineHeight: 1.5,
              }}
            >
              They&rsquo;ll receive an email with a secure sign-up link that expires in 7 days.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: "var(--surface-2)",
              color: "var(--ink-3)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <I.close size={14} />
          </button>
        </div>

        <form action={formAction}>
          <input type="hidden" name="role" value={role} />

          {/* Body */}
          <div style={{ padding: "20px 24px" }}>
            <label htmlFor="invite-email" className="eyebrow" style={{ display: "block", marginBottom: 8 }}>
              Email address
            </label>
            <input
              id="invite-email"
              ref={firstInput}
              name="email"
              type="email"
              required
              placeholder="name@company.com"
              className="input-warm"
              style={{ marginBottom: 14 }}
            />

            <label htmlFor="invite-name" className="eyebrow" style={{ display: "block", marginBottom: 8 }}>
              Display name{" "}
              <span
                style={{
                  textTransform: "none",
                  letterSpacing: 0,
                  color: "var(--ink-4)",
                  fontWeight: 400,
                }}
              >
                — optional
              </span>
            </label>
            <input
              id="invite-name"
              name="displayName"
              type="text"
              placeholder="How their name should appear in the ledger"
              className="input-warm"
              style={{ marginBottom: 18 }}
            />

            <div className="eyebrow" style={{ marginBottom: 8 }}>
              Role
            </div>
            <div
              role="radiogroup"
              aria-label="Role"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <RoleOption
                label="Member"
                desc="Add expenses · view balances"
                selected={role === "member"}
                onClick={() => setRole("member")}
              />
              <RoleOption
                label="Tenant admin"
                desc="Invite members · manage access"
                selected={role === "admin"}
                onClick={() => setRole("admin")}
              />
            </div>

            {state?.error && (
              <div
                role="alert"
                style={{
                  marginTop: 14,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "var(--neg-wash)",
                  color: "var(--neg)",
                  border: "1px solid color-mix(in oklch, var(--neg) 20%, transparent)",
                  fontSize: 13,
                }}
              >
                {state.error}
              </div>
            )}
            {state?.success && (
              <div
                role="status"
                style={{
                  marginTop: 14,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "var(--pos-wash)",
                  color: "var(--pos)",
                  border: "1px solid color-mix(in oklch, var(--pos) 20%, transparent)",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  whiteSpace: "pre-wrap",
                }}
              >
                <I.check size={14} />
                <span style={{ fontWeight: 500 }}>{state.success}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "14px 24px",
              borderTop: "1px solid var(--rule-2)",
              background: "var(--surface-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ height: 38 }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="btn btn-accent"
              style={{ height: 38 }}
            >
              {pending ? (
                <>
                  <span
                    aria-hidden
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: "50%",
                      border: "2px solid oklch(1 0 0 / 0.3)",
                      borderTopColor: "white",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Sending…
                </>
              ) : (
                <>
                  Send invite <I.arrow size={13} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoleOption({
  label,
  desc,
  selected,
  onClick,
}: {
  label: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 4,
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${selected ? "var(--accent)" : "var(--rule)"}`,
        background: selected ? "var(--accent-wash)" : "var(--card)",
        color: selected ? "var(--accent)" : "var(--ink-2)",
        fontFamily: "var(--font-sans)",
        textAlign: "left",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 11, color: selected ? "var(--accent)" : "var(--ink-3)", opacity: 0.85 }}>
        {desc}
      </span>
    </button>
  );
}
