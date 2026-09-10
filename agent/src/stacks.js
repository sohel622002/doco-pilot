import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// Compose files are written under a persistent-per-container-lifetime dir so
// `down`/`list` can reference the same project later without the YAML being
// re-sent. If the agent container is recreated without a mounted volume for
// this path, previously deployed stacks can still be found via `docker
// compose ls` (by label), just not re-downed by name until redeployed.
const STACKS_DIR = process.env.STACKS_DIR || path.join(os.homedir(), ".doco-pilot", "stacks");

// Docker Compose project names: lowercase, digits, - and _ only
function sanitizeStackName(name) {
  if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(name)) {
    throw new Error("Invalid stack name");
  }
  return name;
}

function stackDir(name) {
  return path.join(STACKS_DIR, sanitizeStackName(name));
}

async function writeStackFile(name, composeYaml) {
  const dir = stackDir(name);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "docker-compose.yml"), composeYaml, "utf8");
  return dir;
}

function forwardLines(chunk, onLine) {
  chunk
    .toString("utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .forEach(onLine);
}

function runCompose(args, cwd, onLine) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["compose", ...args], { cwd });
    child.stdout.on("data", (chunk) => forwardLines(chunk, onLine));
    child.stderr.on("data", (chunk) => forwardLines(chunk, onLine));
    child.on("error", (err) => reject(new Error(`Failed to run docker compose: ${err.message}`)));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`docker compose exited with code ${code}`));
    });
  });
}

export async function deployStack(name, composeYaml, onLine) {
  const dir = await writeStackFile(name, composeYaml);
  await runCompose(["-p", sanitizeStackName(name), "up", "-d", "--remove-orphans"], dir, onLine);
  return { ok: true, name };
}

export async function downStack(name, onLine) {
  const dir = stackDir(name);
  await runCompose(["-p", sanitizeStackName(name), "down"], dir, onLine);
  return { ok: true, name };
}

export function listStacks() {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["compose", "ls", "--format", "json", "--all"]);
    let out = "";
    let errOut = "";
    child.stdout.on("data", (c) => (out += c.toString("utf8")));
    child.stderr.on("data", (c) => (errOut += c.toString("utf8")));
    child.on("error", (err) => reject(new Error(`Failed to run docker compose ls: ${err.message}`)));
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(errOut.trim() || "docker compose ls failed"));
      try {
        const parsed = JSON.parse(out || "[]");
        resolve(
          parsed.map((p) => ({
            name: p.Name,
            status: p.Status,
            configFiles: p.ConfigFiles,
          })),
        );
      } catch (err) {
        reject(err);
      }
    });
  });
}
