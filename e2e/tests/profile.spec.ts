import { test, expect } from "../fixtures/auth";
import { registerServerNoAgent } from "../fixtures/docker-agent";

// Profile is account-level and exempted from Layout.jsx's "agent must be
// online" gate (see ACCOUNT_LEVEL_PATHS), so it only needs a valid serverId
// in the URL, not a connected agent.
test.describe("Profile", () => {
  test("editing the display name persists it and updates the header", async ({
    authedPage,
    testUser,
  }) => {
    const serverId = await registerServerNoAgent(authedPage, {
      name: `e2e-profile-${Date.now()}`,
      ip: "127.0.0.1",
    });
    const newName = `${testUser.name} Updated`;

    await authedPage.goto(`/${serverId}/profile`);
    await expect(authedPage.getByRole("heading", { name: testUser.name })).toBeVisible({
      timeout: 10_000,
    });

    await authedPage.getByRole("button", { name: /edit profile/i }).click();
    // FormField's <label> isn't associated with its input (no htmlFor/id),
    // so getByLabel doesn't work here — the Edit Profile modal has exactly
    // one text input.
    const nameInput = authedPage.locator('input[type="text"]');
    await nameInput.fill(newName);
    await authedPage.getByRole("button", { name: /save changes/i }).click();

    await expect(authedPage.getByRole("heading", { name: newName })).toBeVisible({
      timeout: 10_000,
    });

    // Persisted server-side, not just local state — survives a reload.
    await authedPage.reload();
    await expect(authedPage.getByRole("heading", { name: newName })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("changing the password actually changes it - old password stops working, new one logs in", async ({
    authedPage,
    testUser,
  }) => {
    const serverId = await registerServerNoAgent(authedPage, {
      name: `e2e-profile-pw-${Date.now()}`,
      ip: "127.0.0.1",
    });
    const newPassword = "NewTestPassword456!";

    await authedPage.goto(`/${serverId}/profile`);
    await authedPage.getByRole("button", { name: /change password/i }).click();
    // Same FormField label-association gap — three password inputs appear
    // in order: current, new, confirm.
    const passwordInputs = authedPage.locator('input[type="password"]');
    await passwordInputs.nth(0).fill(testUser.password);
    await passwordInputs.nth(1).fill(newPassword);
    await passwordInputs.nth(2).fill(newPassword);
    await authedPage.getByRole("button", { name: /update password/i }).click();

    await expect(authedPage.getByText(/password updated/i)).toBeVisible({ timeout: 10_000 });
    await expect(authedPage).toHaveURL(/\/login/, { timeout: 10_000 });

    // Old password should no longer work.
    await authedPage.getByLabel("Email Address").fill(testUser.email);
    await authedPage.getByLabel("Password").fill(testUser.password);
    await authedPage.getByRole("button", { name: /sign in/i }).click();
    await expect(authedPage.getByText(/failed|invalid|incorrect/i)).toBeVisible({
      timeout: 10_000,
    });

    // New password should work. RootRedirect (/dashboard) sends a user
    // straight to their one existing server's page, not /servers — that
    // list is only the landing spot for a user with zero servers.
    await authedPage.getByLabel("Password").fill(newPassword);
    await authedPage.getByRole("button", { name: /sign in/i }).click();
    await expect(authedPage).toHaveURL(new RegExp(`/${serverId}`), { timeout: 10_000 });
  });

  test("logging out clears the session - protected routes redirect to login again", async ({
    authedPage,
  }) => {
    const serverId = await registerServerNoAgent(authedPage, {
      name: `e2e-profile-logout-${Date.now()}`,
      ip: "127.0.0.1",
    });

    await authedPage.goto(`/${serverId}/profile`);
    await authedPage.getByRole("button", { name: /log out/i }).click();
    await expect(authedPage).toHaveURL(/\/login/, { timeout: 10_000 });

    await authedPage.goto("/servers");
    await expect(authedPage).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
