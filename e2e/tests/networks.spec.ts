import { test, expect } from "../fixtures/connected-server";
import { createThrowawayNetwork, networkExistsLocally, removeNetworkIfPresent } from "../fixtures/docker-agent";

test.describe("Networks - real agent data", () => {
  test.skip(
    process.env.SKIP_AGENT_TESTS === "1",
    "SKIP_AGENT_TESTS=1 - no Docker daemon available in this environment",
  );

  test("a network present on the host shows up in the list", async ({
    authedPage,
    connectedServer,
  }) => {
    const target = createThrowawayNetwork();
    try {
      await authedPage.goto(`/${connectedServer.serverId}/networks`);
      await expect(authedPage.getByText(target.name, { exact: true })).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      target.cleanup();
    }
  });

  test("creating a network via the UI actually creates it in Docker", async ({
    authedPage,
    connectedServer,
  }) => {
    const name = `e2e-created-net-${Date.now()}`;
    try {
      await authedPage.goto(`/${connectedServer.serverId}/networks`);
      await authedPage.getByRole("button", { name: /create network/i }).click();
      await authedPage.getByPlaceholder("my-network").fill(name);
      await authedPage.getByRole("button", { name: "Create", exact: true }).click();

      await expect(authedPage.getByText(name, { exact: true })).toBeVisible({ timeout: 20_000 });
      expect(networkExistsLocally(name)).toBe(true);
    } finally {
      removeNetworkIfPresent(name);
    }
  });

  test("removing an unattached network via the UI actually removes it from Docker", async ({
    authedPage,
    connectedServer,
  }) => {
    const target = createThrowawayNetwork();
    let removedByTest = false;
    try {
      await authedPage.goto(`/${connectedServer.serverId}/networks`);
      const row = authedPage.locator("tr", { hasText: target.name });
      await expect(row).toBeVisible({ timeout: 30_000 });

      authedPage.once("dialog", (dialog) => dialog.accept());
      await row.getByTitle("Remove Network", { exact: true }).click();
      await expect(row).not.toBeVisible({ timeout: 15_000 });

      expect(networkExistsLocally(target.name)).toBe(false);
      removedByTest = true;
    } finally {
      if (!removedByTest) target.cleanup();
    }
  });
});
