import { test, expect } from "@playwright/test";

test.describe("Checkout page", () => {
  test("redirects to upload for invalid cartId", async ({ page }) => {
    await page.goto("/ko/checkout/invalid-cart-id-00000000");
    await expect(page).toHaveURL(/\/ko\/upload/);
  });

  test("redirects to upload for non-existent cartId", async ({ page }) => {
    await page.goto("/ko/checkout/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/ko\/upload/);
  });
});
