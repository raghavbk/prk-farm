#!/usr/bin/env tsx

/**
 * Tenant onboarding CLI. Platform-admin operation — requires
 * SUPABASE_SERVICE_ROLE_KEY to be set in the environment.
 *
 * Usage:
 *   npm run tenant:create -- \
 *     --name "Acme Farm" \
 *     --owner jane@acme.com \
 *     --owner-name "Jane Doe" \
 *     --domain farm.acme.com \
 *     [--alias www.farm.acme.com] \
 *     [--skip-invite]
 *
 * What it does (in one transaction-feeling flow):
 *   1. Creates the tenant row.
 *   2. Registers the primary domain (plus any --alias).
 *   3. Invites the first owner by email with redirectTo pointing at the
 *      tenant's primary domain (so the set-password link lands on the right
 *      host — otherwise the session ends up on the platform domain).
 *   4. Creates the tenant_members owner row.
 *   5. Writes an audit_log entry attributing the onboarding to the
 *      invited owner (no auth.uid() in a CLI context).
 *   6. Prints the DNS CNAME target and next-step instructions.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Args = {
  name: string;
  owner: string;
  ownerName?: string;
  domain: string;
  usedDefaultSubdomain: boolean;
  slug: string;
  alias: string[];
  skipInvite: boolean;
  cnameTarget: string | null;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function getPlatformApex(): string {
  const raw = process.env.PLATFORM_HOSTS;
  if (!raw) return "chukta.in";
  const parts = raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const nonLocal = parts.find((p) => !p.startsWith("localhost") && !p.startsWith("127."));
  return nonLocal ?? parts[0] ?? "chukta.in";
}

function loadEnvLocal() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../.env.local"),
    path.resolve(here, "../.env"),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      const value = rawValue.replace(/^['"]|['"]$/g, "");
      process.env[key] = value;
    }
  }
}

function parseCliArgs(): Args {
  const { values } = parseArgs({
    options: {
      name: { type: "string" },
      owner: { type: "string" },
      "owner-name": { type: "string" },
      slug: { type: "string" },
      domain: { type: "string" },
      alias: { type: "string", multiple: true },
      "skip-invite": { type: "boolean", default: false },
      "cname-target": { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  const missing: string[] = [];
  if (!values.name) missing.push("--name");
  if (!values.owner) missing.push("--owner");
  if (missing.length) {
    console.error(`Missing required flag(s): ${missing.join(", ")}\n`);
    printUsage();
    process.exit(1);
  }

  const name = values.name as string;
  const slugRaw = ((values.slug as string | undefined) ?? "").trim().toLowerCase();
  const slug = slugRaw ? slugify(slugRaw) : slugify(name);
  if (!slug) {
    console.error(`Cannot derive a slug from --name "${name}". Pass --slug explicitly or use ASCII letters/digits.`);
    process.exit(1);
  }
  if (slugRaw && slug !== slugRaw) {
    console.error(
      `--slug "${slugRaw}" has invalid characters. Use only lowercase a–z, 0–9, and hyphens (2–40 chars).`,
    );
    process.exit(1);
  }

  const hasDomain = typeof values.domain === "string" && (values.domain as string).trim().length > 0;
  const domain = hasDomain
    ? normalizeDomain(values.domain as string)
    : `${slug}.${getPlatformApex()}`;

  return {
    name,
    owner: (values.owner as string).toLowerCase().trim(),
    ownerName: values["owner-name"] as string | undefined,
    domain,
    usedDefaultSubdomain: !hasDomain,
    slug,
    alias: ((values.alias as string[] | undefined) ?? []).map(normalizeDomain),
    skipInvite: values["skip-invite"] === true,
    cnameTarget: (values["cname-target"] as string | undefined) ?? process.env.TENANT_CNAME_TARGET ?? null,
  };
}

function printUsage() {
  console.log(`tenant:create — onboard a new tenant

Required:
  --name          Display name for the tenant (e.g. "Acme Farm")
  --owner         First owner's email

Optional:
  --slug          URL-safe tenant slug (2–40 chars, lowercase a–z / 0–9 / -).
                  Used for <slug>.<PLATFORM_APEX> and for tenants.slug.
                  Defaults to the slugified tenant name.
  --domain        Primary custom domain (e.g. farm.acme.com). Defaults to
                  <slug>.<PLATFORM_APEX> (chukta.in unless overridden via env).
  --owner-name    Display name shown in the ledger for the first owner
  --alias         Additional domain alias (repeatable)
  --skip-invite   Skip sending the invite email (owner must already exist)
  --cname-target  CNAME value to print in the next-steps output
                  (defaults to env TENANT_CNAME_TARGET)
`);
}

function normalizeDomain(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) throw new Error("Domain cannot be empty");
  // Strip protocol + trailing slash / path.
  return trimmed
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

function assertEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.\n" +
        "The CLI reads .env.local / .env from the repo root. Set both and retry.",
    );
    process.exit(2);
  }
  return { url, key };
}

async function findExistingDomain(admin: SupabaseClient, domains: string[]) {
  const { data, error } = await admin
    .from("tenant_domains")
    .select("domain, tenant_id")
    .in("domain", domains);
  if (error) throw error;
  return data ?? [];
}

async function main() {
  loadEnvLocal();
  const args = parseCliArgs();
  const { url, key } = assertEnv();

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const allDomains = [args.domain, ...args.alias];
  const existing = await findExistingDomain(admin, allDomains);
  if (existing.length) {
    console.error(
      "Domain already registered on another tenant:\n" +
        existing.map((r) => `  ${r.domain} → tenant ${r.tenant_id}`).join("\n"),
    );
    process.exit(3);
  }

  // 1. Ensure the owner user exists first. tenants.created_by is NOT NULL, so
  //    we need the owner's user id before we can insert the tenant row.
  let ownerUserId: string | null = null;
  const ownerName = args.ownerName?.trim() || args.owner.split("@")[0];

  if (args.skipInvite) {
    const { data: existingProfile, error: lookupErr } = await admin
      .from("profiles")
      .select("id")
      .eq("email", args.owner)
      .maybeSingle();
    if (lookupErr) throw lookupErr;
    if (!existingProfile) {
      console.error(
        `--skip-invite set but no user exists for ${args.owner}. ` +
          "Drop --skip-invite to invite them by email.",
      );
      process.exit(4);
    }
    ownerUserId = existingProfile.id;
  } else {
    const primaryDomain = args.domain;
    const primaryUrl = primaryDomain.includes(":")
      ? `http://${primaryDomain}`
      : `https://${primaryDomain}`;

    const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      args.owner,
      {
        data: {
          full_name: ownerName,
          display_name: ownerName,
          email: args.owner,
          invited_role: "admin",
        },
        redirectTo: `${primaryUrl}/auth/callback`,
      },
    );
    if (inviteErr) {
      console.error(`Invite failed: ${inviteErr.message}`);
      process.exit(5);
    }
    ownerUserId = invite.user.id;

    // Ensure the profile row carries the display_name we showed (the DB
    // trigger picks from metadata at signup, but we want this filled even
    // before the user confirms).
    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        id: ownerUserId,
        display_name: ownerName,
        email: args.owner,
      },
      { onConflict: "id" },
    );
    if (profileErr) throw profileErr;
  }

  // 2. Create the tenant. Resolve a unique slug first — append a random
  //    4-hex suffix if the base slug is taken.
  let tenantSlug = args.slug;
  const { data: slugHit } = await admin
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug)
    .maybeSingle();
  if (slugHit) {
    const suffix = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0");
    tenantSlug = `${tenantSlug.slice(0, 35)}-${suffix}`;
  }

  const { data: tenantRow, error: tenantErr } = await admin
    .from("tenants")
    .insert({ name: args.name, slug: tenantSlug, created_by: ownerUserId })
    .select("id, slug")
    .single();
  if (tenantErr || !tenantRow) {
    throw tenantErr ?? new Error("Tenant creation returned no row");
  }
  const tenantId = tenantRow.id as string;

  // 2. Register domain + aliases.
  const domainRows = [
    { tenant_id: tenantId, domain: args.domain, is_primary: true },
    ...args.alias.map((d) => ({
      tenant_id: tenantId,
      domain: d,
      is_primary: false,
    })),
  ];
  const { error: domainsErr } = await admin.from("tenant_domains").insert(domainRows);
  if (domainsErr) {
    await admin.from("tenants").delete().eq("id", tenantId);
    throw domainsErr;
  }

  // 3. First tenant admin membership. migration 006 replaced the old
  //    "owner" role with "admin"/"member" (platform admins do cross-tenant
  //    work; tenant admins manage their own tenant).
  const { error: memberErr } = await admin
    .from("tenant_members")
    .insert({ tenant_id: tenantId, user_id: ownerUserId, role: "admin" });
  if (memberErr) {
    await admin.from("tenants").delete().eq("id", tenantId);
    throw memberErr;
  }

  // 4. Audit log (best-effort — raw insert so it isn't gated on auth.uid()).
  await admin.from("audit_log").insert({
    tenant_id: tenantId,
    actor_user_id: ownerUserId,
    action: "tenant.onboarded",
    resource_type: "tenant",
    resource_id: tenantId,
    metadata: {
      name: args.name,
      owner_email: args.owner,
      domain: args.domain,
      aliases: args.alias,
      source: "cli",
      skip_invite: args.skipInvite,
    },
  });

  console.log("\n✓ Tenant created\n");
  console.log(`  id:      ${tenantId}`);
  console.log(`  slug:    ${tenantSlug}`);
  console.log(`  name:    ${args.name}`);
  console.log(`  owner:   ${args.owner}${ownerName ? ` (${ownerName})` : ""}`);
  console.log(`  domain:  ${args.domain}  (primary${args.usedDefaultSubdomain ? ", auto-generated" : ""})`);
  for (const a of args.alias) console.log(`           ${a}  (alias)`);
  console.log("");

  console.log("Next steps");
  console.log("----------");
  if (!args.skipInvite) {
    console.log(`1. ${args.owner} will receive an email with a sign-up link.`);
    console.log(`   It lands on https://${args.domain}/auth/callback, so their first`);
    console.log(`   session is scoped to this tenant from the start.\n`);
  }
  if (args.usedDefaultSubdomain) {
    console.log(`2. DNS — ${args.domain} runs on the platform wildcard (*.${getPlatformApex()}).`);
    console.log(`   Make sure the wildcard CNAME + the wildcard domain are configured on`);
    console.log(`   Vercel once; then every new slug under it works with zero DNS.\n`);
  } else if (args.cnameTarget) {
    console.log(`2. DNS — create a CNAME at the owner's registrar:`);
    console.log(`     ${args.domain}   CNAME   ${args.cnameTarget}`);
    for (const a of args.alias) {
      console.log(`     ${a}   CNAME   ${args.cnameTarget}`);
    }
    console.log(`   Then add the same domain(s) to the Vercel project so SSL provisions.\n`);
  } else {
    console.log(`2. DNS — point ${args.domain} at this app's CNAME (not set in env;`);
    console.log(`   pass --cname-target or set TENANT_CNAME_TARGET to include the`);
    console.log(`   exact value here). Then add the domain to Vercel.\n`);
  }
}

main().catch((err) => {
  console.error("\nFailed to create tenant:");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
