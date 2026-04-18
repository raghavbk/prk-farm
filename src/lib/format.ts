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
