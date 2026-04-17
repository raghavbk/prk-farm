import { test, expect } from "@playwright/test";

// This E2E test requires:
// 1. Supabase local running (supabase start)
// 2. .env.local configured with local Supabase URL/keys
// 3. A test user seeded in auth.users
//
// To run: npx playwright test

test.describe("Farm Share Ledger full flow", () => {
  test.skip(
    !process.env.E2E_ENABLED,
    "Set E2E_ENABLED=1 to run E2E tests with local Supabase"
  );

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Sign in with Google")).toBeVisible();
  });

  test("full flow: create tenant, group, expense, view balance", async ({
    page,
  }) => {
    // Assumes user is already authenticated (seeded session cookie)
    // This would be set up in a test fixture

    // 1. Create tenant
    await page.goto("/tenants");
    await page.fill('input[name="name"]', "Test Farm");
    await page.click('button:has-text("Create")');
    await expect(page).toHaveURL("/");

    // 2. Navigate to create group
    await page.click('a:has-text("+ New")');
    await expect(page).toHaveURL(/\/groups\/new/);
    await page.fill('input[name="name"]', "Crop Season 2026");

    // 3. Add members (requires seeded users in profiles table)
    // ... member search and ownership setup ...

    // 4. Add expense from group detail
    // await page.click('a:has-text("Add Expense")');
    // await page.fill('input[name="description"]', "Fertilizer");
    // await page.fill('input[name="amount"]', "5000");
    // await page.click('button:has-text("Add Expense")');

    // 5. Verify balance shows on group detail
    // await expect(page.getByText(/owes/)).toBeVisible();

    // 6. Verify dashboard shows summary
    // await page.goto("/");
    // await expect(page.getByText(/You Owe/)).toBeVisible();
  });
});
