import { test as base, expect, type Page } from "@playwright/test";
import "dotenv/config";

const EMAIL_DOMAIN = process.env.TEST_EMAIL_DOMAIN || "doco-pilot.test";

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

/** A fresh, never-before-used identity for one test — avoids cross-test collisions. */
export function makeTestUser(label = "user"): TestUser {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `E2E ${label}`,
    email: `e2e+${label}-${unique}@${EMAIL_DOMAIN}`,
    password: "TestPassword123!",
  };
}

/** Registers a new account through the real UI and lands on /dashboard. */
export async function registerViaUI(page: Page, user: TestUser) {
  await page.goto("/register");
  await page.getByPlaceholder("Enter your full name").fill(user.name);
  await page.getByPlaceholder("name@company.com").fill(user.email);
  await page.getByPlaceholder("Create a password").fill(user.password);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/servers/, { timeout: 15_000 });
}

/** Logs an existing account in through the real UI and lands on /dashboard. */
export async function loginViaUI(page: Page, user: Pick<TestUser, "email" | "password">) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/servers/, { timeout: 15_000 });
}

/**
 * `authedPage` — a page already logged in as a freshly-registered user.
 * Each test gets its own account, so tests never see each other's servers/data.
 */
export const test = base.extend<{ authedPage: Page; testUser: TestUser }>({
  testUser: async ({}, use) => {
    await use(makeTestUser());
  },
  authedPage: async ({ page, testUser }, use) => {
    await registerViaUI(page, testUser);
    await use(page);
  },
});

export { expect };
