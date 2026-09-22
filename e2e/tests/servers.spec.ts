import { test, expect } from "../fixtures/auth";
import { registerServerWithRealAgent } from "../fixtures/docker-agent";

test.describe("Servers - real agent connection", () => {
  test.skip(
    process.env.SKIP_AGENT_TESTS === "1",
    "SKIP_AGENT_TESTS=1 — no Docker daemon available in this environment",
  );

  test("registering a server shows the install command, and a real agent connects", async ({
    authedPage,
  }) => {
    const serverName = `e2e-server-${Date.now()}`;
    const { cleanup } = await registerServerWithRealAgent(authedPage, {
      name: serverName,
      ip: "127.0.0.1",
    });

    try {
      await expect(authedPage.getByText(serverName)).toBeVisible();
      await expect(authedPage.getByText("Agent Online")).toBeVisible();
    } finally {
      cleanup();
    }
  });

  test("deleting a server removes it from the list", async ({ authedPage }) => {
    const serverName = `e2e-delete-${Date.now()}`;
    await authedPage.goto("/servers");
    await authedPage.getByPlaceholder("prod-01").fill(serverName);
    await authedPage.getByPlaceholder("203.0.113.10").fill("127.0.0.1");
    await authedPage.getByRole("button", { name: /add server/i }).click();
    await expect(authedPage.getByText(serverName)).toBeVisible();

    authedPage.once("dialog", (dialog) => dialog.accept());
    await authedPage.getByTitle("Delete server").click();

    await expect(authedPage.getByText(serverName)).not.toBeVisible();
  });
});
