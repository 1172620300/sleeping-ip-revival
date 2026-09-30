import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { testBaseURL, testEnvironment } from "./scripts/test-setup.cjs";

const environment = testEnvironment();
Object.assign(process.env, environment);
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".local/playwright");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  globalSetup: "./scripts/test-setup.cjs",
  outputDir: "test-results",
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: testBaseURL,
    trace: "off", // Do not persist credentials or authenticated cookies in traces.
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100",
    url: testBaseURL,
    timeout: 120_000,
    reuseExistingServer: false,
    env: environment,
    stdout: "pipe",
    stderr: "pipe",
  },
});
