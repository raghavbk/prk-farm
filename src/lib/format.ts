// Indian number grouping (₹1,23,456) and helpers used across the UI.

const inrWithDecimals = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrNoDecimals = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

// Used by components that still import formatINR.
export function formatINR(amount: number): string {
  return inrWithDecimals.format(amount);
}

// Matches design spec: ₹1,23,456 with no decimals by default.
export function formatInr(
  amount: number,
  { decimals = 0, withSymbol = true }: { decimals?: number; withSymbol?: boolean } = {}
): string {
  const fmt = decimals === 0
    ? inrNoDecimals
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
  const out = fmt.format(amount);
  return withSymbol ? out : out.replace(/^₹/, "").trim();
}

// Signed version ("+₹1,234" / "−₹1,234") for balance displays.
export function formatInrSigned(amount: number): string {
  if (amount === 0) return formatInr(0);
  const abs = Math.abs(amount);
  const sign = amount > 0 ? "+" : "−";
  return `${sign}${formatInr(abs)}`;
}

export function initialsOf(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Stable hue (0-360) for a given id. Gives each member a consistent avatar color.
export function hueForId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function firstName(name: string | null | undefined): string {
  if (!name) return "there";
  return name.trim().split(/\s+/)[0];
}

// "just now" / "5m ago" / "3h ago" / "6d ago" / "12 Mar 2026".
// Admin area (members-tab, invites-tab) uses its own variants with
// yesterday/weeks/months buckets.
export function formatUpdatedAt(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 14) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
