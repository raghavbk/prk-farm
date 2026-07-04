import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- Module-level mocks ----
const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

const getActiveTenantIdMock = vi.fn();
vi.mock("@/lib/tenant", () => ({
  getActiveTenantId: () => getActiveTenantIdMock(),
}));

const canManageTenantMock = vi.fn();
vi.mock("@/lib/platform", () => ({
  canManageTenant: () => canManageTenantMock(),
}));

// Chainable Supabase builder shared by user and admin clients.
function buildTable(opts: {
  selectData?: unknown;
  insertData?: unknown;
  updateData?: unknown;
  deleteError?: { code?: string; message: string } | null;
  insertError?: { code?: string; message: string } | null;
  updateError?: { code?: string; message: string } | null;
  selectError?: { message: string } | null;
}) {
  const chain: Record<string, unknown> = {};
  const make = () => chain;
  chain.select  = vi.fn(make);
  chain.insert  = vi.fn(make);
  chain.update  = vi.fn(make);
  chain.delete  = vi.fn(make);
  chain.eq      = vi.fn(make);
  chain.ilike   = vi.fn(make);
  chain.single  = vi.fn().mockImplementation(async () => {
    if (opts.insertError)  return { data: null, error: opts.insertError };
    if (opts.updateError)  return { data: null, error: opts.updateError };
    if (opts.selectError)  return { data: null, error: opts.selectError };
    if (opts.selectData !== undefined) return { data: opts.selectData, error: null };
    if (opts.insertData !== undefined) return { data: opts.insertData, error: null };
    if (opts.updateData !== undefined) return { data: opts.updateData, error: null };
    return { data: null, error: null };
  });
  chain.maybySingle = vi.fn().mockResolvedValue({ data: null });
  // deleteTagAction calls .delete().eq(id).eq(tenant_id) — two chained .eq() calls.
  const err = opts.deleteError ?? null;
  const deleteChain = {
    eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: err }) }),
  };
  chain.delete = vi.fn(() => deleteChain);
  return chain;
}

let userTable: ReturnType<typeof buildTable>;
let adminTable: ReturnType<typeof buildTable>;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: () => userTable })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: () => adminTable })),
}));

import { createTagAction, updateTagAction, deleteTagAction } from "../tags";

const TENANT = "tenant-1";
const TAG: { id: string; name: string; color: string; tenant_id: string; created_by: string } = {
  id: "tag-1", name: "Agri", color: "#d4a853", tenant_id: TENANT, created_by: "user-1",
};

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  getActiveTenantIdMock.mockResolvedValue(TENANT);
  canManageTenantMock.mockResolvedValue(false);
  // Default: insert succeeds, returning new tag.
  userTable  = buildTable({ insertData: TAG, selectData: TAG }) as ReturnType<typeof buildTable>;
  adminTable = buildTable({ updateData: TAG, selectData: TAG }) as ReturnType<typeof buildTable>;
});

// --------------- createTagAction ---------------
describe("createTagAction", () => {
  it("returns error when not authenticated", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect(await createTagAction(TENANT, "Agri", "#d4a853")).toEqual({ error: "Not authenticated" });
  });

  it("returns error for empty tag name", async () => {
    expect(await createTagAction(TENANT, "   ", "#d4a853")).toEqual({ error: "Tag name is required" });
  });

  it("returns error when name exceeds 32 characters", async () => {
    expect(await createTagAction(TENANT, "A".repeat(33), "#d4a853")).toEqual({
      error: "Tag name must be 32 characters or fewer",
    });
  });

  it("returns the created tag on success", async () => {
    userTable = buildTable({ insertData: TAG }) as ReturnType<typeof buildTable>;
    const result = await createTagAction(TENANT, "Agri", "#d4a853");
    expect(result).toEqual({ tag: TAG });
  });

  it("returns the existing tag when a duplicate name is inserted (23505)", async () => {
    // First .single() call is the insert (duplicate error), second is the lookup.
    let call = 0;
    userTable = buildTable({}) as ReturnType<typeof buildTable>;
    (userTable as Record<string, unknown>).single = vi.fn().mockImplementation(async () => {
      call++;
      if (call === 1) return { data: null, error: { code: "23505", message: "unique" } };
      return { data: TAG, error: null };
    });
    const result = await createTagAction(TENANT, "Agri", "#d4a853");
    expect(result).toEqual({ tag: TAG });
  });
});

// --------------- updateTagAction ---------------
describe("updateTagAction", () => {
  it("returns error when not authenticated", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect(await updateTagAction("tag-1", "New", "#7fb069")).toEqual({ error: "Not authenticated" });
  });

  it("returns error when there is no active tenant", async () => {
    getActiveTenantIdMock.mockResolvedValue(null);
    expect(await updateTagAction("tag-1", "New", "#7fb069")).toEqual({ error: "No active tenant" });
  });

  it("returns error for empty name", async () => {
    userTable = buildTable({ selectData: TAG }) as ReturnType<typeof buildTable>;
    expect(await updateTagAction("tag-1", "  ", "#7fb069")).toEqual({ error: "Tag name is required" });
  });

  it("returns error when tag is not found in this tenant", async () => {
    userTable = buildTable({ selectData: null }) as ReturnType<typeof buildTable>;
    expect(await updateTagAction("tag-1", "New", "#7fb069")).toEqual({ error: "Tag not found" });
  });

  it("returns error when non-creator non-admin tries to edit", async () => {
    // tag was created by someone else
    userTable = buildTable({ selectData: { id: "tag-1", created_by: "other-user" } }) as ReturnType<typeof buildTable>;
    canManageTenantMock.mockResolvedValue(false);
    expect(await updateTagAction("tag-1", "New", "#7fb069")).toEqual({
      error: "Only the tag creator or an admin can edit this tag",
    });
  });

  it("succeeds when the current user is the creator", async () => {
    userTable = buildTable({ selectData: { id: "tag-1", created_by: "user-1" } }) as ReturnType<typeof buildTable>;
    adminTable = buildTable({ updateData: { ...TAG, name: "New", color: "#7fb069" } }) as ReturnType<typeof buildTable>;
    const result = await updateTagAction("tag-1", "New", "#7fb069");
    expect(result).toEqual({ tag: expect.objectContaining({ name: "New" }) });
  });

  it("succeeds when the current user is an admin (even if not creator)", async () => {
    userTable = buildTable({ selectData: { id: "tag-1", created_by: "other-user" } }) as ReturnType<typeof buildTable>;
    canManageTenantMock.mockResolvedValue(true);
    adminTable = buildTable({ updateData: { ...TAG, name: "Renamed" } }) as ReturnType<typeof buildTable>;
    const result = await updateTagAction("tag-1", "Renamed", "#7fb069");
    expect(result).toEqual({ tag: expect.objectContaining({ name: "Renamed" }) });
  });

  it("returns error when update hits a duplicate name constraint (23505)", async () => {
    userTable = buildTable({ selectData: { id: "tag-1", created_by: "user-1" } }) as ReturnType<typeof buildTable>;
    adminTable = buildTable({ updateError: { code: "23505", message: "unique" } }) as ReturnType<typeof buildTable>;
    const result = await updateTagAction("tag-1", "Agri", "#7fb069");
    expect(result).toEqual({ error: "A tag with that name already exists" });
  });
});

// --------------- deleteTagAction ---------------
describe("deleteTagAction", () => {
  it("returns error when not authenticated", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect(await deleteTagAction("tag-1")).toEqual({ error: "Not authenticated" });
  });

  it("returns error when there is no active tenant", async () => {
    getActiveTenantIdMock.mockResolvedValue(null);
    expect(await deleteTagAction("tag-1")).toEqual({ error: "No active tenant" });
  });

  it("returns empty object on success", async () => {
    userTable = buildTable({ deleteError: null }) as ReturnType<typeof buildTable>;
    expect(await deleteTagAction("tag-1")).toEqual({});
  });

  it("returns error when delete fails", async () => {
    userTable = buildTable({ deleteError: { message: "FK violation" } }) as ReturnType<typeof buildTable>;
    const result = await deleteTagAction("tag-1");
    expect(result).toEqual({ error: "FK violation" });
  });
});
