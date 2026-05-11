import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteAuthUserIfOrphan } from "../auth-cleanup";

type AdminLike = {
  from: ReturnType<typeof vi.fn>;
  auth: { admin: { deleteUser: ReturnType<typeof vi.fn> } };
};

function makeAdminMock(opts: {
  memberCount?: number;
  isPlatformAdmin?: boolean;
  profileEmail?: string | null;
  pendingInviteCount?: number;
}): AdminLike {
  const {
    memberCount = 0,
    isPlatformAdmin = false,
    profileEmail = null,
    pendingInviteCount = 0,
  } = opts;

  const tenantMembers = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ count: memberCount }),
  };
  const platformAdmins = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: isPlatformAdmin ? { user_id: "u" } : null,
    }),
  };
  const profiles = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: profileEmail ? { email: profileEmail } : null,
    }),
  };
  // The real call chain is: from("tenant_invites").select(..., {count, head}).eq("email", ...).eq("status", "pending")
  // We need .eq twice and then await — so wire the second .eq to resolve.
  const tenantInvitesChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi
      .fn()
      .mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ count: pendingInviteCount }),
      })
      .mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: pendingInviteCount }),
      }),
  };

  const from = vi.fn((table: string) => {
    if (table === "tenant_members") return tenantMembers;
    if (table === "platform_admins") return platformAdmins;
    if (table === "profiles") return profiles;
    if (table === "tenant_invites") return tenantInvitesChain;
    throw new Error(`unexpected table ${table}`);
  });

  return {
    from,
    auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ data: {}, error: null }) } },
  };
}

describe("deleteAuthUserIfOrphan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does NOT delete the auth user when they still have a tenant membership", async () => {
    const admin = makeAdminMock({ memberCount: 1 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await deleteAuthUserIfOrphan(admin as any, "u1");
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("does NOT delete the auth user when they are a platform admin", async () => {
    const admin = makeAdminMock({ memberCount: 0, isPlatformAdmin: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await deleteAuthUserIfOrphan(admin as any, "u1");
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("does NOT delete the auth user when a pending invite for their email exists", async () => {
    const admin = makeAdminMock({
      memberCount: 0,
      isPlatformAdmin: false,
      profileEmail: "user@example.com",
      pendingInviteCount: 1,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await deleteAuthUserIfOrphan(admin as any, "u1");
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("DELETES the auth user when fully orphaned", async () => {
    const admin = makeAdminMock({
      memberCount: 0,
      isPlatformAdmin: false,
      profileEmail: "user@example.com",
      pendingInviteCount: 0,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await deleteAuthUserIfOrphan(admin as any, "u1");
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith("u1");
  });
});
