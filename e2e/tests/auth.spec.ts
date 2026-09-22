import { test, expect } from "@playwright/test";
import { makeTestUser, registerViaUI, loginViaUI } from "../fixtures/auth";

test.describe("Authentication", () => {
  test("a new visitor can register and lands on the dashboard", async ({ page }) => {
    const user = makeTestUser("register");
    await registerViaUI(page, user);
    await expect(page).toHaveURL(/\/servers/);
  });

  test("registering with an already-used email shows an error, not a crash", async ({ page }) => {
    const user = makeTestUser("dupe");
    await registerViaUI(page, user);

    // Registering the same email again in a fresh context
    await page.context().clearCookies();
    await page.goto("/register");
    await page.getByPlaceholder("Enter your full name").fill(user.name);
    await page.getByPlaceholder("name@company.com").fill(user.email);
    await page.getByPlaceholder("Create a password").fill(user.password);
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/failed|already|exists|taken/i)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/register/);
  });

  test("a registered user can log out and log back in", async ({ page }) => {
    const user = makeTestUser("login");
    await registerViaUI(page, user);

    await page.context().clearCookies(); // simplest reliable "log out" for this suite
    await loginViaUI(page, user);
    await expect(page).toHaveURL(/\/servers/);
  });

  test("logging in with a wrong password shows an error", async ({ page }) => {
    const user = makeTestUser("wrongpw");
    await registerViaUI(page, user);
    await page.context().clearCookies();

    await page.goto("/login");
    await page.getByLabel("Email Address").fill(user.email);
    await page.getByLabel("Password").fill("DefinitelyWrongPassword1!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/failed|invalid|incorrect/i)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("an unauthenticated visitor hitting a protected route is redirected to /login", async ({ page }) => {
    await page.goto("/servers");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("the forgot-password form accepts an email without revealing whether it exists", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email Address").fill("someone@doco-pilot.test");
    await page.getByRole("button", { name: /send reset link/i }).click();

    // Should not error out or leak account existence — just acknowledge the request.
    await expect(page.getByText(/if that email is registered/i)).toBeVisible({ timeout: 10_000 });
  });
});
