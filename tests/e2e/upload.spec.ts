import { test, expect } from "@playwright/test";

test.describe("Upload page", () => {
  test("redirects to home when wallet is not connected", async ({ page }) => {
    await page.goto("/ko/upload");
    // WalletContext.isConnected is false by default → router.replace("/")
    await expect(page).toHaveURL(/\/ko\/?$/);
  });

  test("does not render upload form when unauthenticated", async ({ page }) => {
    await page.goto("/ko/upload");
    // FileUploadZone should not be visible
    const uploadZone = page.locator('[data-testid="file-upload-zone"], input[type="file"]');
    await expect(uploadZone).toHaveCount(0);
  });
});
