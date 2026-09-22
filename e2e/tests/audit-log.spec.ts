import { test, expect } from "../fixtures/auth";
import { registerServerNoAgent } from "../fixtures/docker-agent";

// Audit Log is account-level and exempted from Layout.jsx's "agent must be
// online" gate (see ACCOUNT_LEVEL_PATHS), so it only needs a valid serverId
// in the URL, not a connected agent. /api/audit-logs itself has no serverId
// param — it returns every action across all servers the user can access.
test.describe("Audit Log", () => {
  test("server create and delete actions show up in the audit log", async ({
    authedPage,
  }) => {
    const serverName = `e2e-audit-${Date.now()}`;
    const serverId = await registerServerNoAgent(authedPage, {
      name: serverName,
      ip: "127.0.0.1",
    });

    // Settings' Danger Zone needs a connected agent to even reach the page
    // (not exempted like Audit Log/Profile are), so delete via the Servers
    // list instead — that page has no such gate.
    await authedPage.goto("/servers");
    const card = authedPage.locator(".grid > div", { hasText: serverName }).first();
    authedPage.once("dialog", (dialog) => dialog.accept());
    await card.getByTitle("Delete server").click();
    await expect(authedPage.getByText(serverName)).not.toBeVisible({ timeout: 10_000 });

    await authedPage.goto(`/${serverId}/audit-log`);

    const createRow = authedPage.locator("tr", { hasText: "server:create" });
    await expect(createRow).toBeVisible({ timeout: 10_000 });
    await expect(createRow.getByText("ok", { exact: true })).toBeVisible();

    const deleteRow = authedPage.locator("tr", { hasText: "server:delete" });
    await expect(deleteRow).toBeVisible();
    await expect(deleteRow.getByText("ok", { exact: true })).toBeVisible();
  });

  test("pagination: Newer is disabled on the first page", async ({ authedPage }) => {
    const serverId = await registerServerNoAgent(authedPage, {
      name: `e2e-audit-page-${Date.now()}`,
      ip: "127.0.0.1",
    });

    await authedPage.goto(`/${serverId}/audit-log`);
    await expect(authedPage.getByRole("button", { name: "Newer" })).toBeDisabled();
  });
});
