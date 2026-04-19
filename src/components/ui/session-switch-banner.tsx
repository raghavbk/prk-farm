"use client";

import { useTransition } from "react";
import { dismissSessionSwitchFlash } from "@/actions/flash";
import { I } from "@/components/ui/icons";

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
      <p style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 12, color: "var(--ink-3)" }}>
        <strong style={{ display: "block", fontSize: 13, color: "var(--ink)", marginBottom: 2 }}>
          You&rsquo;re now signed in as {currentEmail}
        </strong>
        The invite link replaced the previous session on this browser
        (<span className="mono">{previousEmail}</span>). Sign out and back in
        if you meant to stay on that account.
      </p>
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
