import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("shows the hero, nav, and CTA for a logged-out visitor", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your Docker fleet");
    await expect(page.getByRole("link", { name: /try it (for )?free/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();
  });

  test("nav anchors scroll to the right sections", async ({ page }) => {
    await page.goto("/");
    // "Features"/"Security"/"Pricing"/"Compare" also appear in the footer —
    // scope to the top nav specifically so the click is unambiguous.
    const nav = page.getByRole("navigation");

    for (const [linkName, sectionId] of [
      ["Features", "features"],
      ["Security", "security"],
      ["Pricing", "pricing"],
      ["Compare", "compare"],
      ["FAQ", "faq"],
    ] as const) {
      await nav.getByRole("link", { name: linkName, exact: true }).click();
      await expect(page.locator(`#${sectionId}`)).toBeInViewport();
    }
  });

  test("comparison table and FAQ render real content", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /where docopilot fits/i })).toBeVisible();
    // "Portainer" appears in several places on the page (intro copy, FAQ) —
    // the comparison table's column header is the specific thing this test
    // cares about.
    await expect(page.getByRole("columnheader", { name: "Portainer" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "What is DocoPilot?" })).toBeVisible();
  });

  test("register CTA takes a visitor to the register page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /try it for free/i }).first().click();
    await expect(page).toHaveURL(/\/register/);
  });
});
