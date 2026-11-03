import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 240_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: 0,
  use: {
    actionTimeout: 15_000,
    baseURL: process.env.E2E_URL ?? "http://localhost:5173",
    channel: process.env.CI ? undefined : "msedge",
    viewport: { width: 1440, height: 1000 },
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
    geolocation: { latitude: 5.5571, longitude: 95.3237, accuracy: 12 },
    permissions: ["geolocation"],
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
