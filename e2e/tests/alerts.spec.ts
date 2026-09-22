import { test, expect } from "../fixtures/connected-server";

// Alerts itself is plain REST (no WebSocket, no live container/image data),
// but Layout.jsx gates every per-server route except /billing, /audit-log,
// and /profile behind a connected agent (systemData.agentState === "online"
// from the store), and /alerts isn't in that exemption list — so this still
// needs a real connected agent to even reach the page, via the shared
// connectedServer fixture.
test.describe("Alerts - webhook config", () => {
  test.skip(
    process.env.SKIP_AGENT_TESTS === "1",
    "SKIP_AGENT_TESTS=1 - no Docker daemon available in this environment",
  );

  test("saving alert rule settings persists them across a reload", async ({
    authedPage,
    connectedServer,
  }) => {
    const webhookUrl = "https://hooks.slack.com/services/T00/B00/e2e-test";

    await authedPage.goto(`/${connectedServer.serverId}/alerts`);

    await authedPage.getByPlaceholder("https://hooks.slack.com/services/…").fill(webhookUrl);
    await authedPage.locator('input[type="number"]').fill("85");
    await authedPage.getByRole("button", { name: /^save$/i }).click();

    await expect(authedPage.getByText("Alert settings saved.")).toBeVisible({ timeout: 10_000 });

    await authedPage.reload();
    await expect(
      authedPage.getByPlaceholder("https://hooks.slack.com/services/…"),
    ).toHaveValue(webhookUrl, { timeout: 10_000 });
    await expect(authedPage.locator('input[type="number"]')).toHaveValue("85");
  });

  test("shows the agent as Online once connected", async ({ authedPage, connectedServer }) => {
    await authedPage.goto(`/${connectedServer.serverId}/alerts`);
    await expect(authedPage.getByText("Online", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  });
});
