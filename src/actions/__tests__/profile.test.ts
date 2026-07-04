import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- Module-level mocks ----
const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

const updateMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  // Return updateMock directly so per-test mockReturnValue calls aren't overwritten
  // when the factory re-evaluates inside the action.
  createClient: vi.fn(async () => ({
    from: () => ({ update: updateMock }),
  })),
}));

import { updateDisplayName } from "../profile";

function makeFormData(name: string): FormData {
  const fd = new FormData();
  fd.set("displayName", name);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  updateMock.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
});

describe("updateDisplayName", () => {
  it("returns error when not authenticated", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect(await updateDisplayName(undefined, makeFormData("Alice"))).toEqual({
      error: "Not authenticated",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns error for empty name", async () => {
    expect(await updateDisplayName(undefined, makeFormData("   "))).toEqual({
      error: "Name cannot be empty",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns error when name exceeds 80 characters", async () => {
    expect(await updateDisplayName(undefined, makeFormData("A".repeat(81)))).toEqual({
      error: "Name must be 80 characters or fewer",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns success and revalidates /profile on a valid update", async () => {
    const result = await updateDisplayName(undefined, makeFormData("Pavan Mudalagi"));
    expect(result).toEqual({ success: true });
    expect(updateMock).toHaveBeenCalledWith({ display_name: "Pavan Mudalagi" });
    expect(revalidatePathMock).toHaveBeenCalledWith("/profile");
  });

  it("trims leading/trailing whitespace from the name", async () => {
    await updateDisplayName(undefined, makeFormData("  Trimmed  "));
    expect(updateMock).toHaveBeenCalledWith({ display_name: "Trimmed" });
  });

  it("returns error when the database update fails", async () => {
    updateMock.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
    });
    expect(await updateDisplayName(undefined, makeFormData("Alice"))).toEqual({
      error: "DB error",
    });
  });
});
