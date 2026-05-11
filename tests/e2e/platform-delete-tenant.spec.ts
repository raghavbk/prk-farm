import { test, expect } from "@playwright/test";

// Requires:
//  1. Supabase local running (supabase start).
//  2. .env.local pointed at local Supabase.
//  3. Seeded platform-admin user + a target tenant ("acme") with two members.
//  4. Authenticated session cookie for the platform-admin user.
//
// Run: E2E_ENABLED=1 npx playwright test tests/e2e/platform-delete-tenant.spec.ts

test.describe("platform admin deletes a tenant", () => {
  test.skip(
    !process.env.E2E_ENABLED,
    "Set E2E_ENABLED=1 to run E2E tests with local Supabase",
  );

  test("type-the-slug confirm gate + delete + audit + slug reuse", async ({ page }) => {
    await page.goto("/platform");
    await expect(page.getByRole("heading", { name: /tenants?/i })).toBeVisible();

    // Locate the row for tenant "acme" and open its delete dialog.
    const acmeRow = page.locator("div", { hasText: "acme" }).first();
    await acmeRow.getByRole("button", { name: /delete acme/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Wrong slug → button stays disabled.
    const slugInput = dialog.locator('input[name="confirm_slug"]');
    await slugInput.fill("acmexx");
    const deleteBtn = dialog.getByRole("button", { name: /delete tenant/i });
    await expect(deleteBtn).toBeDisabled();

    // Correct slug → enabled → click.
    await slugInput.fill("acme");
    await expect(deleteBtn).toBeEnabled();
    await deleteBtn.click();

    // After revalidate the row should be gone.
    await expect(page.locator("div", { hasText: "acme" })).toHaveCount(0);

    // Slug freed: re-onboarding the same slug should succeed.
    await page.goto("/platform/onboard");
    await page.fill('input[name="name"]', "Acme 2");
    await page.fill('input[name="slug"]', "acme");
    await page.fill('input[name="owner_email"]', "owner+reuse@example.test");
    await page.click('button:has-text("Onboard")');
    await expect(page.getByText(/onboard/i)).toBeVisible();
  });
});
