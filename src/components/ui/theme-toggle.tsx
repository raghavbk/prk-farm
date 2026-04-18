"use client";

import { useSyncExternalStore } from "react";
import { I } from "./icons";

type Theme = "light" | "dark";

// Subscribe to DOM attribute changes on <html data-theme>. This lets React
// mirror theme state without a setState-in-effect cascade.
function subscribe(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

function readTheme(): Theme {
  return (document.documentElement.getAttribute("data-theme") as Theme) ?? "light";
}

// Server snapshot — we have no theme until hydration. Returning 'light' is
// safe because the bootstrap script in layout.tsx has already applied the
// real theme before the first paint.
const serverSnapshot: Theme = "light";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => serverSnapshot);

  const flip = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("farm-theme", next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  };

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={label}
      title={label}
      className="btn btn-ghost"
      style={{
        width: compact ? 36 : 40,
        height: compact ? 36 : 40,
        padding: 0,
        borderRadius: 10,
      }}
    >
      {theme === "dark" ? <I.sun size={16} /> : <I.moon size={16} />}
    </button>
  );
}
