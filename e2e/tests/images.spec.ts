import { test, expect } from "../fixtures/connected-server";
import { pullThrowawayImage, removeImageIfPresent, imageExistsLocally } from "../fixtures/docker-agent";

test.describe("Images - real agent data", () => {
  test.skip(
    process.env.SKIP_AGENT_TESTS === "1",
    "SKIP_AGENT_TESTS=1 — no Docker daemon available in this environment",
  );

  test("an image present on the host shows up in the list", async ({
    authedPage,
    connectedServer,
  }) => {
    const { tag, cleanup } = pullThrowawayImage("hello-world:latest");
    const repository = tag.split(":")[0];
    try {
      await authedPage.goto(`/${connectedServer.serverId}/images`);
      await expect(authedPage.getByText(repository, { exact: true })).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      cleanup();
    }
  });

  test("pulling an image via the UI actually pulls it in Docker", async ({
    authedPage,
    connectedServer,
  }) => {
    // A distinct, tiny, rarely-already-cached tag so this exercises a real
    // pull rather than finding the image already local.
    const tag = "alpine:3.19";
    const repository = "alpine";
    removeImageIfPresent(tag); // make sure we're actually exercising a pull, not a no-op

    try {
      await authedPage.goto(`/${connectedServer.serverId}/images`);
      await authedPage.getByPlaceholder("e.g. nginx:latest").fill(tag);
      await authedPage.getByRole("button", { name: /pull image/i }).click();

      // Images.jsx now reacts to the agent's real images:pull:result message
      // (see websocket-handlers.js "images:pulled" event) instead of a
      // blind 3s timeout, so the row appears as soon as the pull actually
      // finishes — no reload-polling needed.
      await expect(authedPage.getByText(repository, { exact: true })).toBeVisible({
        timeout: 60_000,
      });

      expect(imageExistsLocally(tag)).toBe(true);
    } finally {
      removeImageIfPresent(tag);
    }
  });

  test("removing an image via the UI actually removes it from Docker", async ({
    authedPage,
    connectedServer,
  }) => {
    const { tag } = pullThrowawayImage("hello-world:latest");
    const repository = tag.split(":")[0];
    let removedByTest = false;

    try {
      await authedPage.goto(`/${connectedServer.serverId}/images`);
      const row = authedPage.locator("tr", { hasText: repository });
      await expect(row).toBeVisible({ timeout: 20_000 });

      await row.getByTitle("Remove Image").click();
      await expect(row).not.toBeVisible({ timeout: 15_000 });

      expect(imageExistsLocally(tag)).toBe(false);
      removedByTest = true;
    } finally {
      if (!removedByTest) removeImageIfPresent(tag);
    }
  });
});
