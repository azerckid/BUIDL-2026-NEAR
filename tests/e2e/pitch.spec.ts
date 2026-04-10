import { test, expect } from "@playwright/test";

const TOTAL_SLIDES = 12;

test.describe("Pitch deck page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ko/pitch");
  });

  test("page loads successfully", async ({ page }) => {
    const response = await page.goto("/ko/pitch");
    expect(response?.status()).toBe(200);
  });

  test("first slide is visible on load", async ({ page }) => {
    // Slide counter shows "Slide 1 / 12"
    const counter = page.locator("header").filter({ hasText: /1\s*\/\s*12/ });
    await expect(counter).toBeVisible();
  });

  test(`progress dots: ${TOTAL_SLIDES} indicators rendered`, async ({ page }) => {
    // Footer has one dot button per slide
    const dots = page.locator("footer button[aria-label^='Go to slide']");
    await expect(dots).toHaveCount(TOTAL_SLIDES);
  });

  test("Prev button is disabled on first slide", async ({ page }) => {
    // Prev/Next buttons have no aria-label; dot buttons do. Use :not([aria-label]) to isolate them.
    const prevBtn = page.locator("footer button:not([aria-label])").first();
    await expect(prevBtn).toBeDisabled();
  });

  test("Next button navigates to slide 2", async ({ page }) => {
    const nextBtn = page.locator("footer button:not([aria-label])").last();
    await nextBtn.click();
    const counter = page.locator("header").filter({ hasText: /2\s*\/\s*12/ });
    await expect(counter).toBeVisible();
  });

  test("Next button is disabled on last slide", async ({ page }) => {
    // Jump to last slide via dot navigation
    const dots = page.locator("footer button[aria-label^='Go to slide']");
    await dots.last().click();
    const counter = page.locator("header").filter({ hasText: /12\s*\/\s*12/ });
    await expect(counter).toBeVisible();

    const nextBtn = page.locator("footer button").last();
    await expect(nextBtn).toBeDisabled();
  });

  test("ArrowRight key navigates to next slide", async ({ page }) => {
    await page.keyboard.press("ArrowRight");
    const counter = page.locator("header").filter({ hasText: /2\s*\/\s*12/ });
    await expect(counter).toBeVisible();
  });

  test("ArrowLeft key navigates to previous slide", async ({ page }) => {
    // Go to slide 2 first
    const nextBtn = page.locator("footer button:not([aria-label])").last();
    await nextBtn.click();
    // Then go back with ArrowLeft
    await page.keyboard.press("ArrowLeft");
    const counter = page.locator("header").filter({ hasText: /1\s*\/\s*12/ });
    await expect(counter).toBeVisible();
  });

  test("clicking a dot navigates to that slide", async ({ page }) => {
    const dots = page.locator("footer button[aria-label^='Go to slide']");
    // Click slide 5
    await dots.nth(4).click();
    const counter = page.locator("header").filter({ hasText: /5\s*\/\s*12/ });
    await expect(counter).toBeVisible();
  });
});
