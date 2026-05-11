import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Module-level mocks ----
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: vi.fn().mockResolvedValue({ data: null, error: null }) })),
}));

const isPlatformAdminMock = vi.fn();
vi.mock("@/lib/platform", () => ({
  isCurrentUserPlatformAdmin: () => isPlatformAdminMock(),
  canManageTenant: vi.fn(),
  isCurrentUserTenantAdmin: vi.fn(),
}));

const deleteAuthUserIfOrphanMock = vi.fn();
vi.mock("@/lib/auth-cleanup", () => ({
  deleteAuthUserIfOrphan: (...args: unknown[]) => deleteAuthUserIfOrphanMock(...args),
}));

const logActionMock = vi.fn();
vi.mock("@/lib/audit", () => ({
  logAction: (...args: unknown[]) => logActionMock(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// Configurable admin-client mock. Each test rebuilds it.
type AdminMock = ReturnType<typeof buildAdmin>;
function buildAdmin(opts: {
  tenant?: { id: string; name: string; slug: string } | null;
  members?: { user_id: string }[];
  deleteError?: { message: string } | null;
}) {
  const { tenant = { id: "t1", name: "Acme", slug: "acme" }, members = [], deleteError = null } = opts;

  const tenantsTable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: tenant }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: deleteError }),
    }),
  };
  const membersTable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: members, error: null }),
  };
  const domainsTable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { domain: "acme.example.test" } }),
  };

  const from = vi.fn((table: string) => {
    if (table === "tenants") return tenantsTable;
    if (table === "tenant_members") return membersTable;
    if (table === "tenant_domains") return domainsTable;
    throw new Error(`unexpected table ${table}`);
  });

  return { from, tenantsTable, membersTable, domainsTable };
}

let currentAdmin: AdminMock;
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => currentAdmin,
}));

beforeEach(() => {
  vi.clearAllMocks();
  currentAdmin = buildAdmin({});
});

// ---- Import under test (must be after mocks) ----
import { deleteTenant } from "../platform";

function makeFormData(tenantId: string, confirmSlug: string): FormData {
  const fd = new FormData();
  fd.set("tenant_id", tenantId);
  fd.set("confirm_slug", confirmSlug);
  return fd;
}

describe("deleteTenant", () => {
  it("rejects non-platform-admin callers", async () => {
    isPlatformAdminMock.mockResolvedValue(false);
    const res = await deleteTenant(undefined, makeFormData("t1", "acme"));
    expect(res).toEqual({ ok: false, error: "Not authorized." });
    expect(currentAdmin.tenantsTable.delete).not.toHaveBeenCalled();
  });

  it("returns 'no longer exists' when the tenant cannot be found", async () => {
    isPlatformAdminMock.mockResolvedValue(true);
    currentAdmin = buildAdmin({ tenant: null });
    const res = await deleteTenant(undefined, makeFormData("missing", "acme"));
    expect(res).toEqual({ ok: false, error: "Tenant no longer exists." });
  });

  it("rejects mismatched slug confirmation", async () => {
    isPlatformAdminMock.mockResolvedValue(true);
    const res = await deleteTenant(undefined, makeFormData("t1", "wrong-slug"));
    expect(res).toEqual({ ok: false, error: "Slug did not match." });
    expect(currentAdmin.tenantsTable.delete).not.toHaveBeenCalled();
  });

  it("deletes the tenant, calls orphan cleanup per member, and writes one audit row", async () => {
    isPlatformAdminMock.mockResolvedValue(true);
    currentAdmin = buildAdmin({
      tenant: { id: "t1", name: "Acme", slug: "acme" },
      members: [{ user_id: "u1" }, { user_id: "u2" }],
    });

    const res = await deleteTenant(undefined, makeFormData("t1", "acme"));

    expect(res).toEqual({ ok: true, tenantId: "t1", slug: "acme" });
    expect(currentAdmin.tenantsTable.delete).toHaveBeenCalledTimes(1);
    expect(deleteAuthUserIfOrphanMock).toHaveBeenCalledWith(currentAdmin, "u1");
    expect(deleteAuthUserIfOrphanMock).toHaveBeenCalledWith(currentAdmin, "u2");
    expect(logActionMock).toHaveBeenCalledTimes(1);
    expect(logActionMock.mock.calls[0][0]).toMatchObject({
      tenantId: null,
      action: "tenant.deleted",
      resourceType: "tenant",
      resourceId: "t1",
      metadata: expect.objectContaining({
        deleted_tenant_id: "t1",
        name: "Acme",
        slug: "acme",
        member_count: 2,
      }),
    });
  });

  it("surfaces the Postgres error when the delete fails", async () => {
    isPlatformAdminMock.mockResolvedValue(true);
    currentAdmin = buildAdmin({ deleteError: { message: "FK constraint blah" } });
    const res = await deleteTenant(undefined, makeFormData("t1", "acme"));
    expect(res).toEqual({ ok: false, error: "FK constraint blah" });
    expect(deleteAuthUserIfOrphanMock).not.toHaveBeenCalled();
  });

  it("collects failed orphan cleanups into the audit metadata", async () => {
    isPlatformAdminMock.mockResolvedValue(true);
    currentAdmin = buildAdmin({ members: [{ user_id: "u1" }, { user_id: "u2" }] });
    deleteAuthUserIfOrphanMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("boom"));

    const res = await deleteTenant(undefined, makeFormData("t1", "acme"));

    expect(res).toEqual({ ok: true, tenantId: "t1", slug: "acme" });
    expect(logActionMock.mock.calls[0][0].metadata.failed_user_cleanups).toEqual(["u2"]);
  });
});
