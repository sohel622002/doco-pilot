import { test, expect } from "../fixtures/connected-server";
import { createThrowawayVolume, volumeExistsLocally } from "../fixtures/docker-agent";

test.describe("Volumes - real agent data", () => {
  test.skip(
    process.env.SKIP_AGENT_TESTS === "1",
    "SKIP_AGENT_TESTS=1 - no Docker daemon available in this environment",
  );

  test("a volume present on the host shows up in the list", async ({
    authedPage,
    connectedServer,
  }) => {
    const target = createThrowawayVolume();
    try {
      await authedPage.goto(`/${connectedServer.serverId}/volumes`);
      // exact: true — the volume name also appears as a substring of its
      // mountpoint path (e.g. /var/lib/docker/volumes/<name>/_data).
      await expect(authedPage.getByText(target.name, { exact: true })).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      target.cleanup();
    }
  });

  test("an unattached volume is marked Orphaned and can be removed via the UI", async ({
    authedPage,
    connectedServer,
  }) => {
    const target = createThrowawayVolume();
    let removedByTest = false;
    try {
      await authedPage.goto(`/${connectedServer.serverId}/volumes`);
      const row = authedPage.locator("tr", { hasText: target.name });
      await expect(row).toBeVisible({ timeout: 30_000 });
      await expect(row.getByText("Orphaned")).toBeVisible();

      authedPage.once("dialog", (dialog) => dialog.accept());
      await row.getByTitle("Remove Volume", { exact: true }).click();
      await expect(row).not.toBeVisible({ timeout: 15_000 });

      expect(volumeExistsLocally(target.name)).toBe(false);
      removedByTest = true;
    } finally {
      if (!removedByTest) target.cleanup();
    }
  });
});
