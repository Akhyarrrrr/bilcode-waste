// Captures the web screenshots used in README and docs.
// Usage: node scripts/capture-screenshots.mjs [baseUrl]   (default http://localhost:5173)
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const base = process.argv[2] ?? "http://localhost:5173";
const out = resolve("docs/screenshots");
const admin = ["admin@bilcode-waste.test", "BilcodeAdmin2026!"];
const photo = resolve("apps/api/prisma/demo-images/paper-03.jpg");
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  channel: process.env.CI ? undefined : "msedge",
});

async function session(colorScheme, width = 1440, height = 900) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme,
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
  });
  const page = await context.newPage();
  await page.goto(`${base}/login`);
  await page.getByLabel("Email").fill(admin[0]);
  await page.getByLabel("Kata sandi", { exact: true }).fill(admin[1]);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("**/dashboard");
  return { context, page };
}

async function shot(page, path, name, { fullPage = false } = {}) {
  await page.goto(`${base}${path}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage });
  console.log(`${name}.png`);
}

const guest = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: "light",
});
await shot(guest, "/", "web-landing");
await guest.close();

const light = await session("light");
await shot(light.page, "/dashboard", "web-dashboard");
await shot(light.page, "/reports", "web-reports");
const first = light.page.locator("tbody tr a").first();
await light.page.goto(`${base}/reports?status=IN_PROGRESS`);
await first.waitFor();
await shot(
  light.page,
  new URL(await first.getAttribute("href"), base).pathname,
  "web-report-detail",
);
await shot(light.page, "/users", "web-users");
await light.page.goto(`${base}/reports/new`);
await light.page.getByLabel("Pilih foto sampah").setInputFiles(photo);
await light.page.getByText(/^Saran AI:/).waitFor({ timeout: 90_000 });
await light.page.waitForTimeout(900);
await light.page.screenshot({ path: `${out}/web-report-form-ai.png` });
console.log("web-report-form-ai.png");
await light.context.close();

const dark = await session("dark");
await shot(dark.page, "/dashboard", "web-dashboard-dark");
await dark.context.close();

const phone = await session("light", 390, 844);
await shot(phone.page, "/dashboard", "web-phone-dashboard");
await phone.context.close();

await browser.close();
