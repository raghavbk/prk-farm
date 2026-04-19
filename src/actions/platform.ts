"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserPlatformAdmin } from "@/lib/platform";
import { getPlatformApex } from "@/lib/platform-hosts";
import { slugify, uniqueSlug, isValidSlug, isReservedSlug } from "@/lib/slug";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type OnboardResult = {
  ok: true;
  tenantId: string;
  slug: string;
  primaryDomain: string;
  fallbackDomain: string | null;
  ownerEmail: string;
  cnameTarget: string | null;
  inviteSent: boolean;
} | {
  ok: false;
  error: string;
};

export type OnboardActionState = OnboardResult | undefined;

function normaliseDomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

export async function onboardTenant(
  _prev: OnboardActionState,
  formData: FormData,
): Promise<OnboardResult> {
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Not authorized." };
  }

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const ownerEmail = (formData.get("owner_email") as string | null)?.trim().toLowerCase() ?? "";
  const ownerName = (formData.get("owner_name") as string | null)?.trim() ?? "";
  const customDomainInput = (formData.get("custom_domain") as string | null)?.trim() ?? "";
  const customDomain = customDomainInput ? normaliseDomain(customDomainInput) : "";
  const slugInput = (formData.get("slug") as string | null)?.trim().toLowerCase() ?? "";

  if (!name) return { ok: false, error: "Tenant name is required." };
  if (!ownerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    return { ok: false, error: "A valid owner email is required." };
  }
  if (customDomain && !/^[a-z0-9.-]+$/.test(customDomain)) {
    return { ok: false, error: "Custom domain has invalid characters." };
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  const apex = getPlatformApex();

  // Slug resolution: operator override (validated + uniqueness-checked) or
  // auto-derived from the tenant name.
  let slug: string;
  if (slugInput) {
    const cleaned = slugify(slugInput);
    if (!isValidSlug(cleaned) || cleaned !== slugInput) {
      return {
        ok: false,
        error: "Slug must be lowercase a–z / 0–9 / hyphens, 2–40 chars, no leading/trailing hyphen.",
      };
    }
    if (isReservedSlug(cleaned)) {
      return { ok: false, error: `Slug "${cleaned}" is reserved — pick another.` };
    }
    const { data: clash } = await admin
      .from("tenants")
      .select("id")
      .eq("slug", cleaned)
      .maybeSingle();
    if (clash) return { ok: false, error: `Slug "${cleaned}" is taken.` };
    slug = cleaned;
  } else {
    slug = await uniqueSlug(name, async (candidate: string) => {
      if (!isValidSlug(candidate)) return true;
      const { data } = await admin.from("tenants").select("id").eq("slug", candidate).maybeSingle();
      return !!data;
    });
  }
  const defaultDomain = `${slug}.${apex}`;

  const primaryDomain = customDomain || defaultDomain;
  const fallbackDomain = customDomain && customDomain !== defaultDomain ? defaultDomain : null;

  // Make sure the domains we're about to register aren't already taken.
  const wantedDomains = [primaryDomain, ...(fallbackDomain ? [fallbackDomain] : [])];
  const { data: existingDomains } = await admin
    .from("tenant_domains")
    .select("domain")
    .in("domain", wantedDomains);
  if (existingDomains && existingDomains.length) {
    return {
      ok: false,
      error: `Domain already registered: ${existingDomains.map((d) => d.domain).join(", ")}`,
    };
  }

  // Invite owner first so tenants.created_by can reference their profile id.
  const effectiveOwnerName = ownerName || slugify(ownerEmail.split("@")[0]) || "Owner";
  const primaryUrl = primaryDomain.includes(":")
    ? `http://${primaryDomain}`
    : `https://${primaryDomain}`;

  const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    ownerEmail,
    {
      data: {
        full_name: effectiveOwnerName,
        display_name: effectiveOwnerName,
        email: ownerEmail,
        invited_role: "owner",
      },
      redirectTo: `${primaryUrl}/auth/callback`,
    },
  );

  let ownerUserId: string | null = invite?.user?.id ?? null;
  let inviteSent = !inviteErr;

  if (inviteErr) {
    // Likely: this email already has a Supabase Auth user. Reuse them so we
    // don't block onboarding on "user already exists".
    const existingLookup = await admin.from("profiles").select("id").eq("email", ownerEmail).maybeSingle();
    if (existingLookup.data?.id) {
      ownerUserId = existingLookup.data.id;
      inviteSent = false;
    } else {
      return { ok: false, error: `Invite failed: ${inviteErr.message}` };
    }
  }
  if (!ownerUserId) return { ok: false, error: "Could not resolve owner user id." };

  // Best-effort profile upsert so display_name shows immediately.
  await admin.from("profiles").upsert(
    { id: ownerUserId, display_name: effectiveOwnerName, email: ownerEmail },
    { onConflict: "id" },
  );

  // Create the tenant (needs owner id for created_by).
  const { data: tenantRow, error: tenantErr } = await admin
    .from("tenants")
    .insert({ name, slug, created_by: ownerUserId })
    .select("id, slug")
    .single();
  if (tenantErr || !tenantRow) {
    return { ok: false, error: `Tenant create failed: ${tenantErr?.message ?? "unknown"}` };
  }
  const tenantId = tenantRow.id as string;

  // Register domain(s).
  const domainRows = [
    { tenant_id: tenantId, domain: primaryDomain, is_primary: true },
    ...(fallbackDomain
      ? [{ tenant_id: tenantId, domain: fallbackDomain, is_primary: false }]
      : []),
  ];
  const { error: domainsErr } = await admin.from("tenant_domains").insert(domainRows);
  if (domainsErr) {
    await admin.from("tenants").delete().eq("id", tenantId);
    return { ok: false, error: `Domain register failed: ${domainsErr.message}` };
  }

  // Owner membership.
  const { error: memberErr } = await admin
    .from("tenant_members")
    .insert({ tenant_id: tenantId, user_id: ownerUserId, role: "owner" });
  if (memberErr) {
    await admin.from("tenants").delete().eq("id", tenantId);
    return { ok: false, error: `Member insert failed: ${memberErr.message}` };
  }

  // Audit.
  await logAction({
    tenantId,
    action: "tenant.onboarded",
    resourceType: "tenant",
    resourceId: tenantId,
    metadata: {
      name,
      slug,
      owner_email: ownerEmail,
      primary_domain: primaryDomain,
      fallback_domain: fallbackDomain,
      source: "platform_ui",
      invite_sent: inviteSent,
    },
  });

  // RLS still applies to supabase.auth-authed queries — make sure the platform
  // page re-reads.
  void supabase;
  revalidatePath("/platform");

  return {
    ok: true,
    tenantId,
    slug,
    primaryDomain,
    fallbackDomain,
    ownerEmail,
    cnameTarget: process.env.TENANT_CNAME_TARGET ?? null,
    inviteSent,
  };
}
