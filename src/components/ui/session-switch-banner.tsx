"use client";

import { useTransition } from "react";
import { dismissSessionSwitchFlash } from "@/actions/flash";
import { I } from "@/components/ui/icons";

// Rendered by the protected layout when the current session was just
// swapped in via an invite link (the browser was previously signed in as
// a different user). The banner calls a server action to clear the flash
// cookie + re-render when the user dismisses.
export function SessionSwitchBanner({
  previousEmail,
  currentEmail,
}: {
  previousEmail: string;
  currentEmail: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 16px",
        margin: "12px 16px 0",
        borderRadius: 12,
        background: "var(--accent-wash)",
        border: "1px solid var(--rule)",
        color: "var(--ink)",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "var(--accent)",
          color: "var(--accent-ink, #fff)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <I.check size={14} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
          You&rsquo;re now signed in as {currentEmail}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
          The invite link replaced the previous session on this browser
          (<span className="mono">{previousEmail}</span>). Sign out and back in
          if you meant to stay on that account.
        </div>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => dismissSessionSwitchFlash())}
        aria-label="Dismiss"
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          border: "none",
          background: "transparent",
          color: "var(--ink-3)",
          cursor: pending ? "default" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <I.close size={14} />
      </button>
    </div>
  );
}
