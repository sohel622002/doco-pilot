import { test, expect } from "../fixtures/connected-server";

// /stacks isn't in Layout.jsx's ACCOUNT_LEVEL_PATHS exemption list, so it
// needs a connected agent just to reach the page — even the parts below
// that are pure REST CRUD (saving/editing/deleting a stack's YAML never
// touches the agent at all; only Deploy/Down do).
test.describe("Stacks", () => {
  test.skip(
    process.env.SKIP_AGENT_TESTS === "1",
    "SKIP_AGENT_TESTS=1 - no Docker daemon available in this environment",
  );

  test("creating, editing, and deleting a saved stack works end to end", async ({
    authedPage,
    connectedServer,
  }) => {
    const stackName = `e2e-stack-${Date.now()}`;

    await authedPage.goto(`/${connectedServer.serverId}/stacks`);
    await authedPage.getByRole("button", { name: /new stack/i }).click();

    await authedPage.getByPlaceholder("e.g. my-app").fill(stackName);
    // Leave the default compose YAML — this test never deploys it, just
    // exercises the saved-stack CRUD, which is plain REST against the DB.
    await authedPage.getByRole("button", { name: /save stack/i }).click();

    const card = authedPage.locator(".flex.items-center.justify-between", {
      hasText: stackName,
    }).first();
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card.getByText("Not running")).toBeVisible();

    // Edit: name field is locked once saved, only the compose YAML is editable.
    await card.getByTitle("Edit", { exact: true }).click();
    await expect(authedPage.getByPlaceholder("e.g. my-app")).toBeDisabled();
    const yamlBox = authedPage.locator("textarea");
    await yamlBox.fill("services:\n  app:\n    image: nginx:alpine\n");
    await authedPage.getByRole("button", { name: /save stack/i }).click();
    await expect(card).toBeVisible({ timeout: 10_000 });

    authedPage.once("dialog", (dialog) => dialog.accept());
    await card.getByTitle("Delete saved stack", { exact: true }).click();
    await expect(card).not.toBeVisible({ timeout: 10_000 });
  });

  test(
    "deploying a stack surfaces a clear error to the user",
    { tag: "@known-broken" },
    async ({ authedPage, connectedServer }) => {
      // SKIPPED — not a test bug, a confirmed real gap. Investigated
      // 2026-09-22: this doesn't fail with a clean "Failed: ..." message at
      // all right now. The published ghcr.io/.../doco-pilot-agent:latest
      // image predates the Stacks feature in agent/src entirely — its own
      // container logs show `Action "stacks:deploy:start" failed: Unknown
      // action: stacks:deploy:start`. That error goes out as a generic
      // `docker:error` message (the catch-all path in agent/src/ws.js), but
      // Stacks.jsx never listens for `docker:error` (only Images.jsx does,
      // since that was added for the pull-timing fix) — so the "Deploying…"
      // modal just sits on "Waiting for output…" forever with zero
      // feedback. Two real, separate issues here:
      //   1. The published agent image needs republishing from current
      //      agent/src (see TESTING.md Known issues for details — this is
      //      a CI/release process gap the user chose to just document for
      //      now, not fix in this pass).
      //   2. Even once that's fixed, StackOpModal/Stacks.jsx has no
      //      `docker:error` handler, so *any* deploy/down failure that
      //      goes through that generic path (not just this one) would
      //      still hang silently instead of showing "Failed: ...".
      // Un-skip this once both are addressed.
      test.skip(true, "Published agent image predates Stacks — see TESTING.md Known issues");

      const stackName = `e2e-stack-deploy-${Date.now()}`;

      await authedPage.goto(`/${connectedServer.serverId}/stacks`);
      await authedPage.getByRole("button", { name: /new stack/i }).click();
      await authedPage.getByPlaceholder("e.g. my-app").fill(stackName);
      await authedPage.getByRole("button", { name: /save stack/i }).click();

      const card = authedPage.locator(".flex.items-center.justify-between", {
        hasText: stackName,
      }).first();
      await expect(card).toBeVisible({ timeout: 10_000 });

      await card.getByTitle("Deploy", { exact: true }).click();
      await expect(authedPage.getByText(/^Failed:/)).toBeVisible({ timeout: 20_000 });

      await authedPage.getByRole("button", { name: "Close", exact: true }).click();
      authedPage.once("dialog", (dialog) => dialog.accept());
      await card.getByTitle("Delete saved stack", { exact: true }).click();
    },
  );
});
