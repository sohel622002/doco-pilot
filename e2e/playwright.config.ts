import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // each server/agent test creates real Docker containers — keep sequential to avoid port/name clashes
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 60_000,

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Assumes `docker-compose up` (server + client) and `supabase start` are
  // already running — see e2e/README.md. Playwright doesn't own that
  // lifecycle because it spans processes outside this directory.
});
