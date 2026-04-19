// Turn a display name into a DNS-safe slug we can use as `<slug>.chukta.in`
// and as the primary key of tenants.slug.
//
// Rules (matched by the DB CHECK constraint):
//  - lowercase ascii letters + digits + hyphens
//  - 2..40 chars
//  - no leading / trailing / double hyphen

const MIN_LEN = 2;
const MAX_LEN = 40;

export function slugify(input: string): string {
  const normalised = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalised.slice(0, MAX_LEN);
}

export function isValidSlug(slug: string): boolean {
  if (slug.length < MIN_LEN || slug.length > MAX_LEN) return false;
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

// Words that would collide with platform routes / produce confusing domains.
// Conservative list — expand as features ship.
const RESERVED = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "chukta",
  "dashboard",
  "dns",
  "help",
  "login",
  "mail",
  "platform",
  "preview",
  "setup",
  "signup",
  "status",
  "support",
  "www",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED.has(slug);
}

// Pick a unique slug. `exists` returns true if the candidate is taken; we'll
// probe `base`, `base-<4hex>`, `base-<4hex>` until one is free (cap at 5
// attempts — collisions at 16^4 are vanishingly rare).
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const clean = slugify(base);
  if (!clean) throw new Error("Cannot derive a slug from this name.");
  if (!isReservedSlug(clean) && !(await exists(clean))) return clean;

  for (let i = 0; i < 5; i++) {
    const suffix = Math.floor(Math.random() * 0xffff)
      .toString(16)
      .padStart(4, "0");
    const candidate = `${clean.slice(0, MAX_LEN - 5)}-${suffix}`;
    if (isValidSlug(candidate) && !(await exists(candidate))) return candidate;
  }
  throw new Error("Could not find an available slug — try a different name.");
}
