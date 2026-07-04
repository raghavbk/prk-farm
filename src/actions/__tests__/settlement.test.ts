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

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); }),
}));

const logActionMock = vi.fn();
vi.mock("@/lib/audit", () => ({
  logAction: (...args: unknown[]) => logActionMock(...args),
}));

// Supabase mocks
type Chain = Record<string, unknown>;
function buildChain(overrides: Partial<{ groupData: unknown; expenseData: unknown; splitError: unknown }>  = {}) {
  const groupData  = overrides.groupData  ?? { id: "grp-1" };
  const expenseData = overrides.expenseData ?? { id: "exp-1" };
  const splitError  = overrides.splitError  ?? null;

  const chain: Chain = {};
  const make = () => chain;
  chain.select = vi.fn(make);
  chain.insert = vi.fn(make);
  chain.eq     = vi.fn(make);
  chain.single = vi.fn().mockImplementation(async () => {
    // First call: groups lookup; second call: expenses insert
    if ((chain.single as { callCount?: number }).callCount === undefined) {
      (chain.single as { callCount?: number }).callCount = 0;
    }
    (chain.single as { callCount: number }).callCount!++;
    if ((chain.single as { callCount: number }).callCount === 1) return { data: groupData, error: null };
    return { data: expenseData, error: null };
  });
  // expense_splits.insert resolves directly
  chain.insert = vi.fn().mockReturnValue({ data: null, error: splitError });
  return chain;
}

let userChain: Chain;
let adminChain: Chain;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: () => userChain })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "expenses")       return { ...adminChain, insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: "exp-1" }, error: null }) })) })) };
      if (table === "expense_splits") return { insert: vi.fn().mockResolvedValue({ error: null }) };
      return adminChain;
    },
  })),
}));

import { recordSettlement } from "../settlement";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const VALID = {
  groupId: "grp-1",
  fromId: "user-a",
  toId: "user-b",
  amount: "1000",
  date: "2026-07-03",
  notes: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue({ id: "user-a" });
  getActiveTenantIdMock.mockResolvedValue("tenant-1");
  canManageTenantMock.mockResolvedValue(false);
  userChain = buildChain();
  adminChain = buildChain();
});

describe("recordSettlement", () => {
  it("returns error when not authenticated", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const result = await recordSettlement(undefined, makeFormData(VALID));
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error when from and to are the same member", async () => {
    const result = await recordSettlement(
      undefined,
      makeFormData({ ...VALID, toId: VALID.fromId }),
    );
    expect(result).toEqual({ error: "Select two different members" });
  });

  it("returns error for zero amount", async () => {
    const result = await recordSettlement(
      undefined,
      makeFormData({ ...VALID, amount: "0" }),
    );
    expect(result).toEqual({ error: "Amount must be greater than zero" });
  });

  it("returns error for negative amount", async () => {
    const result = await recordSettlement(
      undefined,
      makeFormData({ ...VALID, amount: "-500" }),
    );
    expect(result).toEqual({ error: "Amount must be greater than zero" });
  });

  it("returns error when non-admin tries to record a settlement they're not party to", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "bystander" });
    canManageTenantMock.mockResolvedValue(false);
    const result = await recordSettlement(undefined, makeFormData(VALID));
    expect(result).toEqual({ error: "You can only record settlements you are part of" });
  });

  it("allows an admin to record a settlement they're not party to", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "admin-user" });
    canManageTenantMock.mockResolvedValue(true);
    await expect(
      recordSettlement(undefined, makeFormData(VALID)),
    ).rejects.toThrow("NEXT_REDIRECT:/groups/grp-1");
  });

  it("redirects to the group page on success", async () => {
    await expect(
      recordSettlement(undefined, makeFormData(VALID)),
    ).rejects.toThrow("NEXT_REDIRECT:/groups/grp-1");
    expect(logActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "settlement.recorded" }),
    );
  });
});
