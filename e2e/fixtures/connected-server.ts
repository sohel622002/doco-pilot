import { test as authTest } from "./auth";
import { registerServerWithRealAgent } from "./docker-agent";

/**
 * `connectedServer` — registers a server, runs a real agent against it, and
 * navigates into that server's dashboard so `connectedServer.serverId` is
 * ready to use in a URL like `/${connectedServer.serverId}/containers`.
 *
 * Shared by any module whose page needs a live agent connection (Containers,
 * Images, Volumes, Networks, ...). Each test gets its own fresh server/agent.
 */
export const test = authTest.extend<{
  connectedServer: { serverId: string; agentCleanup: () => void };
}>({
  connectedServer: async ({ authedPage }, use, testInfo) => {
    const serverName = `e2e-${testInfo.file.split(/[\\/]/).pop()?.replace(".spec.ts", "")}-${Date.now()}`;
    const { cleanup: agentCleanup } = await registerServerWithRealAgent(authedPage, {
      name: serverName,
      ip: "127.0.0.1",
    });

    // Click into the server to land on its dashboard, then grab the id from the URL.
    await authedPage.getByText(serverName).click();
    await authedPage.waitForURL(/\/[0-9a-f-]{36}(\/|$)/);
    const serverId = new URL(authedPage.url()).pathname.split("/")[1];

    await use({ serverId, agentCleanup });
    agentCleanup();
  },
});

export { expect } from "@playwright/test";
