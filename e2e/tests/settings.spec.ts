import { test, expect } from "../fixtures/connected-server";

// Unlike Alerts, /settings isn't in Layout.jsx's ACCOUNT_LEVEL_PATHS
// exemption list either, so this also needs a real connected agent just to
// reach the page.
test.describe("Settings - danger zone", () => {
  test.skip(
    process.env.SKIP_AGENT_TESTS === "1",
    "SKIP_AGENT_TESTS=1 - no Docker daemon available in this environment",
  );

  test("deleting a server from the Danger Zone removes it and returns to the dashboard", async ({
    authedPage,
    connectedServer,
  }) => {
    await authedPage.goto(`/${connectedServer.serverId}/settings`);
    await expect(authedPage.getByRole("heading", { name: "Danger Zone" })).toBeVisible({
      timeout: 10_000,
    });

    authedPage.once("dialog", (dialog) => dialog.accept());
    await authedPage.getByRole("button", { name: /delete server/i }).click();

    // DangerZoneSection navigates to /dashboard, which then redirects via
    // RootRedirect — to /servers since this was the user's only server.
    await expect(authedPage).toHaveURL(/\/servers/, { timeout: 15_000 });
    await expect(
      authedPage.getByText("No servers yet — add one above to get started."),
    ).toBeVisible({ timeout: 10_000 });
  });
});
