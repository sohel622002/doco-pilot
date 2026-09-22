import { execSync, spawnSync } from "node:child_process";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Registers a server through the real UI, then runs the *actual* generated
 * `docker run` command against the local Docker daemon so a real agent
 * connects to a real backend. Returns once the UI shows "Agent Online".
 *
 * Requires: a working `docker` CLI with a running daemon on the machine
 * running the tests, and BACKEND_WS_URL in the generated command reachable
 * from that daemon (e.g. host.docker.internal when the server itself runs
 * outside Docker, or the `server` service name when using docker-compose).
 */
/**
 * Registers a server through the real UI but never connects an agent to it.
 * Useful for pages that need *a* valid serverId in the URL but don't
 * themselves need live agent data — e.g. Profile, which Layout.jsx exempts
 * from the "agent must be online" gate (see ACCOUNT_LEVEL_PATHS).
 */
export async function registerServerNoAgent(page: Page, { name, ip }: { name: string; ip: string }) {
  await page.goto("/servers");
  await page.getByPlaceholder("prod-01").fill(name);
  await page.getByPlaceholder("203.0.113.10").fill(ip);
  await page.getByRole("button", { name: /add server/i }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 10_000 });

  await page.getByText(name, { exact: true }).click();
  await page.waitForURL(/\/[0-9a-f-]{36}(\/|$)/);
  return new URL(page.url()).pathname.split("/")[1];
}

export async function registerServerWithRealAgent(
  page: Page,
  { name, ip }: { name: string; ip: string },
) {
  await page.goto("/servers");
  await page.getByPlaceholder("prod-01").fill(name);
  await page.getByPlaceholder("203.0.113.10").fill(ip);
  await page.getByRole("button", { name: /add server/i }).click();

  // The block has bash/PowerShell/cmd.exe tabs with different line-continuation
  // syntax — grab whichever tab matches the shell we're actually going to run
  // the command in, not whatever's selected by default.
  if (process.platform === "win32") {
    await page.getByRole("button", { name: "PowerShell" }).click();
  }
  const commandBlock = page.locator("pre").first();
  await expect(commandBlock).toBeVisible({ timeout: 10_000 });
  const dockerRunCommand = (await commandBlock.textContent())?.trim();
  if (!dockerRunCommand) {
    throw new Error("Could not read the generated docker run command from the Servers page");
  }

  const containerName = spawnAgentContainer(dockerRunCommand);

  // useServers() polls every 10s while this page is mounted (see
  // client/src/hooks/useServers.js), so we just wait for the next poll to
  // pick up agent_connected — no manual reload needed.
  const serverCard = page.locator(".grid > div", { hasText: name }).first();
  await expect(serverCard.getByText("Agent Online")).toBeVisible({ timeout: 30_000 });

  return {
    containerName,
    cleanup: () => stopAgentContainer(containerName),
  };
}

function spawnAgentContainer(dockerRunCommand: string): string {
  // The generated command already includes --name; extract it so we can
  // clean up deterministically even if this run() call fails partway.
  const nameMatch = dockerRunCommand.match(/--name\s+(\S+)/);
  const containerName = nameMatch?.[1];
  if (!containerName) {
    throw new Error(`Generated docker command has no --name flag: ${dockerRunCommand}`);
  }

  // Best-effort: remove any stale container from a previous failed run.
  spawnSync("docker", ["rm", "-f", containerName]);

  execSync(dockerRunCommand, { stdio: "inherit", shell: process.platform === "win32" ? "powershell.exe" : "/bin/bash" });
  return containerName;
}

function stopAgentContainer(containerName: string) {
  spawnSync("docker", ["rm", "-f", containerName]);
}

/** Runs a throwaway container so container-list tests have something real to assert on. */
export function runThrowawayContainer(namePrefix = "e2e-target"): { name: string; cleanup: () => void } {
  const name = `${namePrefix}-${Date.now()}`;
  execSync(`docker run -d --name ${name} nginx:alpine`, { stdio: "inherit" });
  return { name, cleanup: () => spawnSync("docker", ["rm", "-f", name]) };
}

/** Removes an image locally (best-effort — used both for setup and cleanup). */
export function removeImageIfPresent(tag: string) {
  spawnSync("docker", ["rmi", "-f", tag]);
}

/** Pulls a real (tiny) image so image-list tests have something to assert on. */
export function pullThrowawayImage(tag = "hello-world:latest") {
  execSync(`docker pull ${tag}`, { stdio: "inherit" });
  return { tag, cleanup: () => removeImageIfPresent(tag) };
}

/** True once `docker image inspect <tag>` succeeds — used to cross-check UI actions against real Docker state. */
export function imageExistsLocally(tag: string): boolean {
  const result = spawnSync("docker", ["image", "inspect", tag], { stdio: "ignore" });
  return result.status === 0;
}

/**
 * Creates a volume not attached to any container — the Volumes page only
 * enables its Remove button for volumes where `orphaned` is true, so tests
 * that need to exercise removal must start from an unattached volume.
 */
export function createThrowawayVolume(namePrefix = "e2e-vol"): { name: string; cleanup: () => void } {
  const name = `${namePrefix}-${Date.now()}`;
  execSync(`docker volume create ${name}`, { stdio: "inherit" });
  return { name, cleanup: () => removeVolumeIfPresent(name) };
}

export function removeVolumeIfPresent(name: string) {
  spawnSync("docker", ["volume", "rm", "-f", name]);
}

export function volumeExistsLocally(name: string): boolean {
  const result = spawnSync("docker", ["volume", "inspect", name], { stdio: "ignore" });
  return result.status === 0;
}

export function createThrowawayNetwork(namePrefix = "e2e-net"): { name: string; cleanup: () => void } {
  const name = `${namePrefix}-${Date.now()}`;
  execSync(`docker network create ${name}`, { stdio: "inherit" });
  return { name, cleanup: () => removeNetworkIfPresent(name) };
}

export function removeNetworkIfPresent(name: string) {
  spawnSync("docker", ["network", "rm", name]);
}

export function networkExistsLocally(name: string): boolean {
  const result = spawnSync("docker", ["network", "inspect", name], { stdio: "ignore" });
  return result.status === 0;
}
