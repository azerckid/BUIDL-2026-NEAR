import { test, expect } from "@playwright/test";

test.describe("Dashboard page", () => {
  test("redirects to upload when sid param is missing", async ({ page }) => {
    await page.goto("/ko/dashboard");
    await expect(page).toHaveURL(/\/ko\/upload/);
  });

  test("redirects to upload when sid param is invalid", async ({ page }) => {
    await page.goto("/ko/dashboard?sid=nonexistent-session-id");
    await expect(page).toHaveURL(/\/ko\/upload/);
  });
});
