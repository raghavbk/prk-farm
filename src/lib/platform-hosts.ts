// Platform apex hosts. Requests landing on one of these are the platform
// admin console (chukta.in), not a customer tenant. Tenant subdomains like
// prk.chukta.in are NOT platform hosts — they still resolve through
// tenant_domains to the tenant they belong to.
//
// Override via PLATFORM_HOSTS (comma-separated) to test against a different
// apex without redeploying. Case-insensitive.

const DEFAULT_PLATFORM_HOSTS = [
  "chukta.in",
  "localhost",
  "localhost:3000",
  "127.0.0.1",
  "127.0.0.1:3000",
];

function parseHosts(raw: string | undefined): string[] {
  if (!raw) return DEFAULT_PLATFORM_HOSTS;
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return parts.length ? parts : DEFAULT_PLATFORM_HOSTS;
}

// NOTE: PLATFORM_HOSTS is read at module load so a single `process.env` lookup
// is shared across calls; change the env and restart the runtime to pick up
// a new value.
export const PLATFORM_HOSTS = parseHosts(process.env.PLATFORM_HOSTS);

export function isPlatformHost(host: string | null | undefined): boolean {
  if (!host) return false;
  return PLATFORM_HOSTS.includes(host.toLowerCase());
}

// The public apex used when auto-generating default tenant subdomains
// (<slug>.<apex>). Picks the first non-local host from PLATFORM_HOSTS so local
// dev doesn't produce slugs like `acme.localhost`.
export function getPlatformApex(): string {
  const first = PLATFORM_HOSTS.find((h) => !isLocalHost(h));
  return first ?? PLATFORM_HOSTS[0] ?? "chukta.in";
}

function isLocalHost(host: string): boolean {
  return host.startsWith("localhost") || host.startsWith("127.");
}

export function schemeFor(host: string): "http" | "https" {
  return isLocalHost(host) ? "http" : "https";
}
