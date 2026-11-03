import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// Test accounts live on the reserved .test domain; `npm run db:seed -- --reset` removes them.
const stamp = Date.now();
const reporter = {
  name: "Pelapor E2E",
  email: `e2e-${stamp}@bilcode-waste.test`,
  password: "E2e-password-2026",
};
const title = `Botol plastik uji E2E ${stamp}`;
const photo = resolve("apps/api/prisma/demo-images/plastic-01.jpg");

test.describe.configure({ mode: "serial" });

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function signInAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Admin demo" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function noHorizontalScroll(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("landing is public, responsive and leads to registration", async ({
  page,
}) => {
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await noHorizontalScroll(page);
  }
  await expect(
    page.getByRole("table").getByRole("rowheader", { name: "Plastik" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Buat laporan" }).first().click();
  await expect(page).toHaveURL(/\/register$/);
});

test("a resident registers, reports with photo and GPS, and sees it pending", async ({
  page,
  context,
}) => {
  await context.setGeolocation({
    latitude: 5.5571,
    longitude: 95.3237,
    accuracy: 12,
  });
  await page.goto("/register");
  await page.getByLabel("Nama lengkap").fill(reporter.name);
  await page.getByLabel("Email").fill(reporter.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(reporter.password);
  await page.getByRole("button", { name: "Buat akun" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/reports/new");
  await page.getByLabel("Pilih foto sampah").setInputFiles(photo);
  // A live model suggests the category; without it the manual fallback is the expected path.
  const suggestion = page.getByText(/^Saran AI:/);
  const failure = page.getByRole("button", { name: "Pilih kategori manual" });
  await expect(suggestion.or(failure)).toBeVisible({ timeout: 90_000 });
  if (await failure.isVisible()) {
    await failure.click();
    await page.getByRole("radio", { name: /Plastik/ }).click();
  }
  await expect(page.getByRole("radio", { name: /Plastik/ })).toBeChecked();
  await page.getByRole("button", { name: "Lanjut" }).click();

  await page.getByRole("button", { name: "Lanjut" }).click();
  await expect(page.getByText("Judul minimal 3 karakter.")).toBeVisible();
  await page.getByLabel("Judul laporan").fill(title);
  await page
    .getByLabel("Deskripsi")
    .fill("Data uji otomatis: botol plastik di tepi trotoar.");
  await page.getByLabel("Nama lokasi atau patokan").fill("Pasar Peunayong");
  await page.getByRole("button", { name: "Gunakan lokasi saya" }).click();
  await expect(page.getByText("5.55710, 95.32370")).toBeVisible();
  await page.getByRole("button", { name: "Lanjut" }).click();

  await expect(page.getByText(title)).toBeVisible();
  await page.getByRole("button", { name: "Kirim laporan" }).click();
  await expect(page).toHaveURL(/\/reports\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("Status: Menunggu").first()).toBeAttached();
  await expect(page.getByRole("button", { name: "Ubah status" })).toHaveCount(
    0,
  );
});

test("admin moves the report through the allowed statuses with notes", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(`/reports?q=${encodeURIComponent(title)}`);
  await page.getByRole("link", { name: title }).click();

  await page.getByRole("button", { name: "Ubah status" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("radio")).toHaveCount(2);
  await dialog.getByRole("radio", { name: /Diproses/ }).click();
  await dialog
    .getByLabel(/Catatan untuk pelapor/)
    .fill("Petugas dijadwalkan besok pagi.");
  await dialog.getByRole("button", { name: "Simpan status" }).click();
  await expect(page.getByText("Status diubah menjadi Diproses.")).toBeVisible();

  await page.getByRole("button", { name: "Ubah status" }).click();
  await dialog.getByRole("radio", { name: /Selesai/ }).click();
  await dialog.getByRole("button", { name: "Simpan status" }).click();
  await expect(page.getByText("Status diubah menjadi Selesai.")).toBeVisible();

  await expect(page.getByText("Petugas dijadwalkan besok pagi.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ubah status" })).toHaveCount(
    0,
  );
});

test("admin exports the filtered list as CSV", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(`/reports?q=${encodeURIComponent(title)}`);
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Export CSV" }).click(),
  ]);
  const csv = await readFile(await download.path(), "utf8");
  expect(csv).toContain("Nomor,Judul,Kategori,Status");
  expect(csv).toContain(`${title},Plastik,Selesai`);
});

test("admin manages users while the shared demo accounts stay locked", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/users");
  const staffEmail = `e2e-staff-${stamp}@bilcode-waste.test`;
  await page.getByRole("button", { name: "Tambah pengguna" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nama").fill("Petugas E2E");
  await dialog.getByLabel("Email").fill(staffEmail);
  await dialog
    .getByLabel("Kata sandi", { exact: true })
    .fill("Staff-password-2026");
  await dialog.getByRole("button", { name: "Tambah pengguna" }).click();
  await expect(page.getByText("Petugas E2E ditambahkan.")).toBeVisible();

  await page.getByLabel("Cari pengguna").fill(staffEmail);
  await expect(page.getByRole("row")).toHaveCount(2);
  await page.getByRole("button", { name: "Ubah pengguna Petugas E2E" }).click();
  await dialog.getByLabel("Akun aktif").click();
  await dialog.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByRole("cell", { name: "Nonaktif" })).toBeVisible();

  await page.getByLabel("Cari pengguna").fill("admin@bilcode-waste.test");
  const demoRow = page.getByRole("row", { name: /admin@bilcode-waste\.test/ });
  await expect(page.getByRole("row")).toHaveCount(2);
  await expect(demoRow.getByText("Akun demo", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Ubah pengguna Admin/ }),
  ).toHaveCount(0);
});

test("a reporter changes their password and signs in again", async ({
  page,
}) => {
  await signIn(page, reporter.email, reporter.password);
  await page.goto("/account");
  await page.getByLabel("Kata sandi saat ini").fill(reporter.password);
  await page.getByLabel("Kata sandi baru").fill("E2e-password-2027");
  await page.getByRole("button", { name: "Ganti kata sandi" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await signIn(page, reporter.email, "E2e-password-2027");
});

test("app shell works on phone, tablet and desktop widths", async ({
  page,
}) => {
  await signInAsAdmin(page);
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/dashboard", "/reports", "/users"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await noHorizontalScroll(page);
    }
  }
  await page.setViewportSize({ width: 360, height: 900 });
  await page.getByRole("button", { name: "Buka menu navigasi" }).click();
  await page.getByRole("link", { name: "Peta laporan" }).click();
  await expect(
    page.getByRole("heading", { name: "Peta laporan" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.keyboard.press("Control+k");
  await page
    .getByRole("dialog")
    .getByPlaceholder(/Cari judul/)
    .fill("Kelola pengguna");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/users$/);
});
