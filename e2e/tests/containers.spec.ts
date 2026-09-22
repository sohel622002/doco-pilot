import { test, expect } from "../fixtures/connected-server";
import { runThrowawayContainer } from "../fixtures/docker-agent";

test.describe("Containers - real agent data", () => {
  test.skip(
    process.env.SKIP_AGENT_TESTS === "1",
    "SKIP_AGENT_TESTS=1 - no Docker daemon available in this environment",
  );

  test("a container running on the host shows up in the list", async ({
    authedPage,
    connectedServer,
  }) => {
    const target = runThrowawayContainer();
    try {
      await authedPage.goto(`/${connectedServer.serverId}/containers`);
      // Generous timeout: runThrowawayContainer's `docker run` blocks until
      // the image is pulled (can be 20-30s+ on a cold cache), so by the time
      // we get here Docker itself is done — but the round trip through the
      // agent's WebSocket connection can still take a few seconds.
      await expect(authedPage.getByText(target.name)).toBeVisible({ timeout: 30_000 });
    } finally {
      target.cleanup();
    }
  });

  test("stopping a running container from the UI actually stops it in Docker", async ({
    authedPage,
    connectedServer,
  }) => {
    const target = runThrowawayContainer();
    try {
      await authedPage.goto(`/${connectedServer.serverId}/containers`);
      const row = authedPage.locator("tr", { hasText: target.name });
      await expect(row).toBeVisible({ timeout: 30_000 });

      await row.getByTitle("Stop", { exact: true }).click();
      // exact: true — without it this also matches the disabled exec button
      // titled "Start the container to open a shell".
      await expect(row.getByTitle("Start", { exact: true })).toBeVisible({ timeout: 15_000 });
    } finally {
      target.cleanup();
    }
  });

  test("removing a stopped container from the UI actually removes it from Docker", async ({
    authedPage,
    connectedServer,
  }) => {
    const target = runThrowawayContainer();
    let removedByTest = false;
    try {
      await authedPage.goto(`/${connectedServer.serverId}/containers`);
      const row = authedPage.locator("tr", { hasText: target.name });
      await expect(row).toBeVisible({ timeout: 30_000 });

      await row.getByTitle("Stop", { exact: true }).click();
      await expect(row.getByTitle("Start", { exact: true })).toBeVisible({ timeout: 15_000 });

      authedPage.once("dialog", (dialog) => dialog.accept());
      await row.getByTitle("Remove", { exact: true }).click();
      await expect(authedPage.getByText(target.name)).not.toBeVisible({ timeout: 15_000 });
      removedByTest = true;
    } finally {
      if (!removedByTest) target.cleanup();
    }
  });
});
