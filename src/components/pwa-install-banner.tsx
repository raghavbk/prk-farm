"use client";

import { useEffect, useState } from "react";

// Show at most once every 14 days, and never inside the installed PWA.
const STORAGE_KEY = "chukta-pwa-banner-dismissed";
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Don't show inside the installed PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((window.navigator as { standalone?: boolean }).standalone) return;

    // Respect cooldown
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const last = parseInt(raw, 10);
        if (Date.now() - last < COOLDOWN_MS) return;
      }
    } catch {}

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    } else {
      setInstalling(false);
      dismiss();
    }
  }

  if (!visible) return null;

  return (
    <div
      role="banner"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        width: "min(calc(100vw - 32px), 420px)",
        background: "var(--card)",
        border: "1px solid var(--rule-strong)",
        borderRadius: 18,
        boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      {/* Icon */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icon-72.png"
        alt=""
        width={44}
        height={44}
        style={{ borderRadius: 10, flexShrink: 0 }}
      />

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: 0, lineHeight: 1.3 }}>
          Add Chukta to your home screen
        </p>
        <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "3px 0 0", lineHeight: 1.4 }}>
          Install for quick access — works offline too.
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        <button
          onClick={install}
          disabled={installing}
          style={{
            background: "var(--accent)",
            color: "#000",
            border: "none",
            borderRadius: 8,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: installing ? "wait" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {installing ? "Installing…" : "Install"}
        </button>
        <button
          onClick={dismiss}
          style={{
            background: "none",
            color: "var(--ink-3)",
            border: "none",
            borderRadius: 8,
            padding: "4px 12px",
            fontSize: 11,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
