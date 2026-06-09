import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

const getActiveTenantIdMock = vi.fn();
vi.mock("@/lib/tenant", () => ({
  getActiveTenantId: () => getActiveTenantIdMock(),
}));

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

const logActionMock = vi.fn();
vi.mock("@/lib/audit", () => ({
  logAction: (...args: unknown[]) => logActionMock(...args),
}));

const groupUpdateMock = vi.fn();
const groupSingleMock = vi.fn();

function buildSupabase() {
  const tenantMembersTable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: "user-1" }, error: null }),
  };

  const groupsTable = {
    update: groupUpdateMock.mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: groupSingleMock,
  };

  return {
    tenantMembersTable,
    groupsTable,
    from: vi.fn((table: string) => {
      if (table === "tenant_members") return tenantMembersTable;
      if (table === "groups") return groupsTable;
      throw new Error(`unexpected table ${table}`);
    }),
  };
}

let supabase: ReturnType<typeof buildSupabase>;
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabase),
}));

vi.mock("@/lib/supabase/admin", () => ({
  // Return the same mock supabase so the admin write path is exercised.
  createAdminClient: vi.fn(() => supabase),
}));

import { updateGroup } from "../group";

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  getActiveTenantIdMock.mockResolvedValue("tenant-1");
  groupSingleMock.mockResolvedValue({ data: { id: "group-1" }, error: null });
  supabase = buildSupabase();
});

describe("updateGroup", () => {
  it("returns a validation error for an empty group name", async () => {
    const result = await updateGroup(
      undefined,
      formData({ groupId: "group-1", name: "   " }),
    );

    expect(result).toEqual({ error: "Group name is required" });
    expect(groupUpdateMock).not.toHaveBeenCalled();
  });

  it("updates the group name through the admin client", async () => {
    await expect(
      updateGroup(
        undefined,
        formData({ groupId: "group-1", name: "  Crop Season 2027  " }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/groups/group-1");

    expect(groupUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Crop Season 2027" }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/groups/group-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/groups/group-1/edit");
    expect(logActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        action: "group.renamed",
        resourceType: "group",
        resourceId: "group-1",
        metadata: { name: "Crop Season 2027" },
      }),
    );
  });
});
