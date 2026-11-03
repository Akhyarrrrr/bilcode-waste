import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/build-app.js";
import { db } from "../src/db.js";
import { csvCell } from "../src/reports.js";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

const lockedEmail = "demo-locked@example.test";
const suffix = randomUUID();
const password = "Valid-test-password-2026!";
const accounts = ["admin", "owner", "other"].map((name) => ({
  name,
  email: `${name}-${suffix}@example.test`,
  password,
}));
const tokens: string[] = [];
let app: Awaited<ReturnType<typeof buildApp>>;
let uploadId: string;
let reportId: string;
const requestId = randomUUID();
const bearer = (index = 1) => ({ authorization: `Bearer ${tokens[index]}` });
const reportBody = () => ({
  title: "Plastik di area taman",
  description: "Botol plastik berserakan di dekat pintu masuk taman.",
  category: "PLASTIC",
  latitude: -6.2,
  longitude: 106.8,
  locationLabel: "Taman uji",
  locationAccuracy: 12,
  uploadId,
  clientRequestId: requestId,
});

beforeAll(async () => {
  // Attempts persist across runs; clear them so the per-IP limit starts fresh.
  await db.authAttempt.deleteMany();
  app = await buildApp({ logger: false });
  for (const account of accounts) {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { ...account, client: "mobile" },
    });
    expect(response.statusCode, response.body).toBe(201);
    expect(response.json().user.passwordHash).toBeUndefined();
    tokens.push(response.json().token);
  }
  await db.user.update({
    where: { email: accounts[0]!.email },
    data: { role: "ADMIN" },
  });
}, 30000);
afterAll(async () => {
  const users = await db.user.findMany({
    where: { email: { endsWith: `${suffix}@example.test` } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  await db.reportStatusHistory.deleteMany({ where: { actorId: { in: ids } } });
  await db.report.deleteMany({ where: { reporterId: { in: ids } } });
  const uploads = await db.upload.findMany({
    where: { ownerId: { in: ids } },
    select: { id: true },
  });
  await db.prediction.deleteMany({
    where: { uploadId: { in: uploads.map((u) => u.id) } },
  });
  await db.upload.deleteMany({ where: { ownerId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await app?.close();
  await db.$disconnect();
}, 30000);

describe.sequential("real PostgreSQL API workflow", () => {
  it("allows login when a database connection takes longer than two seconds", async () => {
    let occupied = 0;
    let markReady!: () => void;
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const holders = Array.from({ length: 3 }, () =>
      db.$transaction(async () => {
        if (++occupied === 3) markReady();
        await held;
      }),
    );
    await ready;
    const timer = setTimeout(release, 3000);
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: accounts[1]!.email, password, client: "mobile" },
      });
      expect(response.statusCode, response.body).toBe(200);
    } finally {
      clearTimeout(timer);
      release();
      await Promise.all(holders);
    }
  }, 20000);
  it("reports liveness, readiness and a status page", async () => {
    const live = await app.inject("/health");
    expect(live.json()).toMatchObject({ status: "ok", version: "1.0.0" });
    // No model service runs in tests: the database is up, so the API is degraded, not down.
    const ready = await app.inject("/health/ready");
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toMatchObject({
      status: "degraded",
      checks: { database: { status: "up" }, model: { status: "down" } },
    });
    const page = await app.inject("/");
    expect(page.headers["content-type"]).toContain("text/html");
    expect(page.body).toContain("Berjalan, model AI tidak tersedia");
  });
  it("serves self-hosted API documentation without loading a static server plugin", async () => {
    const html = await app.inject("/docs");
    expect(html.statusCode).toBe(200);
    expect(html.body).toContain("url:'/openapi.json'");
    const spec = (await app.inject("/openapi.json")).json();
    expect(spec.paths["/api/v1/auth/login"].post.security).toEqual([]);
    expect(spec.paths["/api/v1/auth/register"].post.security).toEqual([]);
    expect(spec.paths["/api/v1/uploads/{id}/image"].get.security).toEqual([]);
    for (const name of ["swagger-ui.css", "swagger-ui-bundle.js"]) {
      const asset = await app.inject(`/docs/assets/${name}`);
      expect(asset.statusCode).toBe(200);
      expect(asset.rawPayload.length).toBeGreaterThan(1000);
    }
  });
  it("rejects whitespace-only names across public and admin account writes", async () => {
    const owner = await db.user.findUniqueOrThrow({
      where: { email: accounts[1]!.email },
    });
    const writes = [
      {
        method: "POST" as const,
        url: "/api/v1/auth/register",
        payload: {
          name: "   ",
          email: `blank-register-${suffix}@example.test`,
          password,
        },
      },
      {
        method: "PATCH" as const,
        url: "/api/v1/auth/me",
        headers: bearer(),
        payload: { name: "   " },
      },
      {
        method: "POST" as const,
        url: "/api/v1/users",
        headers: bearer(0),
        payload: {
          name: "   ",
          email: `blank-admin-${suffix}@example.test`,
          password,
          role: "USER",
        },
      },
      {
        method: "PATCH" as const,
        url: `/api/v1/users/${owner.id}`,
        headers: bearer(0),
        payload: { name: "   " },
      },
    ];
    for (const write of writes) {
      const response = await app.inject(write);
      expect(response.statusCode, `${write.url}: ${response.body}`).toBe(400);
    }
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: owner.id } })).name,
    ).toBe(owner.name);
  });
  it("rejects role escalation and throttles persisted login attempts", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        ...accounts[1],
        email: `bad-${suffix}@example.test`,
        role: "ADMIN",
      },
    });
    expect(response.statusCode).toBe(400);
    const wrong = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: accounts[1]!.email, password: "incorrect-password" },
    });
    expect(wrong.statusCode).toBe(401);
    expect(await db.authAttempt.count()).toBeGreaterThan(0);
  });
  it("requires authentication and admin permission", async () => {
    expect((await app.inject("/api/v1/reports")).statusCode).toBe(401);
    expect(
      (await app.inject({ url: "/api/v1/users", headers: bearer() }))
        .statusCode,
    ).toBe(403);
    expect(
      (await app.inject({ url: "/api/v1/users", headers: bearer(0) }))
        .statusCode,
    ).toBe(200);
  });
  it("validates photo content and returns a private signed image", async () => {
    const file = await sharp({
      create: { width: 32, height: 32, channels: 3, background: "#3852f7" },
    })
      .jpeg()
      .toBuffer();
    const payload = Buffer.concat([
      Buffer.from(
        '--test\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n',
      ),
      file,
      Buffer.from("\r\n--test--\r\n"),
    ]);
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/uploads",
      headers: {
        ...bearer(),
        "content-type": "multipart/form-data; boundary=test",
      },
      payload,
    });
    expect(response.statusCode, response.body).toBe(201);
    uploadId = response.json().id;
    expect(response.json().url).toContain("signature=");
    const image = await app.inject(
      new URL(response.json().url).pathname +
        new URL(response.json().url).search,
    );
    expect(image.statusCode).toBe(200);
    expect(image.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(
      (await app.inject(`/api/v1/uploads/${uploadId}/image`)).statusCode,
    ).toBe(403);
    const forged = await app.inject({
      method: "POST",
      url: "/api/v1/uploads",
      headers: {
        ...bearer(),
        "content-type": "multipart/form-data; boundary=test",
      },
      payload: payload.subarray(0, 110),
    });
    expect(forged.statusCode).toBeGreaterThanOrEqual(400);
  });
  it("creates a pending report idempotently and isolates ownership", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/reports",
      headers: bearer(),
      payload: reportBody(),
    });
    expect(response.statusCode, response.body).toBe(201);
    reportId = response.json().id;
    expect(response.json().status).toBe("PENDING");
    expect(response.json().history).toHaveLength(1);
    const repeat = await app.inject({
      method: "POST",
      url: "/api/v1/reports",
      headers: bearer(),
      payload: reportBody(),
    });
    expect(repeat.json().id).toBe(reportId);
    expect(
      (
        await app.inject({
          url: `/api/v1/reports/${reportId}`,
          headers: bearer(2),
        })
      ).statusCode,
    ).toBe(404);
    const stolen = await app.inject({
      method: "POST",
      url: "/api/v1/reports",
      headers: bearer(2),
      payload: { ...reportBody(), clientRequestId: randomUUID() },
    });
    expect(stolen.statusCode).toBe(404);
  });
  it("rejects skipping status, records transitions, and rejects stale writes", async () => {
    const url = `/api/v1/reports/${reportId}/status`;
    expect(
      (
        await app.inject({
          method: "PATCH",
          url,
          headers: bearer(0),
          payload: { status: "COMPLETED", version: 1 },
        })
      ).statusCode,
    ).toBe(409);
    const next = await app.inject({
      method: "PATCH",
      url,
      headers: bearer(0),
      payload: {
        status: "IN_PROGRESS",
        version: 1,
        note: "Petugas menuju lokasi.",
      },
    });
    expect(next.statusCode, next.body).toBe(200);
    expect(next.json().history).toHaveLength(2);
    expect(
      (
        await app.inject({
          method: "PATCH",
          url,
          headers: bearer(0),
          payload: { status: "COMPLETED", version: 1 },
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/v1/reports/${reportId}`,
          headers: bearer(),
          payload: { version: 2 },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: "PATCH",
          url,
          headers: bearer(0),
          payload: { status: "REJECTED", version: 2 },
        })
      ).statusCode,
    ).toBe(400);
    const finish = await app.inject({
      method: "PATCH",
      url,
      headers: bearer(0),
      payload: {
        status: "COMPLETED",
        version: 2,
        note: "Area telah dibersihkan.",
      },
    });
    expect(finish.statusCode).toBe(200);
    expect(finish.json().history).toHaveLength(3);
  });
  it("filters scope and statistics, and rejects CSRF mutations", async () => {
    const query = encodeURIComponent("Plastik di area taman");
    const response = await app.inject({
      url: `/api/v1/reports?q=${query}&status=COMPLETED`,
      headers: bearer(),
    });
    expect(
      response.json().items.some((r: { id: string }) => r.id === reportId),
    ).toBe(true);
    expect(
      (
        await app.inject({ url: "/api/v1/dashboard", headers: bearer(2) })
      ).json().total,
    ).toBe(0);
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: accounts[1]!.email, password },
    });
    const cookie = login.headers["set-cookie"] as string;
    const attack = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: { cookie, origin: "https://attacker.example" },
    });
    expect(attack.statusCode).toBe(403);
    const stats = (
      await app.inject({ url: "/api/v1/dashboard", headers: bearer() })
    ).json();
    expect(stats.trend).toHaveLength(30);
    expect(stats.counts.COMPLETED).toBe(1);
    expect(stats.avgResolutionHours).toEqual(expect.any(Number));
    expect(stats.aiAgreement).toEqual({ matched: 0, total: 0 });
  });
  it("exports filtered reports as spreadsheet-safe CSV for admins only", async () => {
    expect(
      (await app.inject({ url: "/api/v1/reports/export", headers: bearer() }))
        .statusCode,
    ).toBe(403);
    const query = encodeURIComponent("Plastik di area taman");
    const response = await app.inject({
      url: `/api/v1/reports/export?q=${query}&status=COMPLETED`,
      headers: bearer(0),
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.body.startsWith("﻿Nomor,Judul,Kategori")).toBe(true);
    expect(response.body).toContain("Plastik di area taman,Plastik,Selesai");
    expect(csvCell("=HYPERLINK()")).toBe("'=HYPERLINK()");
    expect(csvCell('Botol, "kaca"')).toBe('"Botol, ""kaca"""');
    expect(csvCell(-5.55)).toBe("-5.55");
  });
  it("locks shared demo accounts against credential and access changes", async () => {
    await db.user.deleteMany({ where: { email: lockedEmail } });
    const demo = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { name: "Demo", email: lockedEmail, password, client: "mobile" },
    });
    expect(demo.json().user.isLocked).toBe(true);
    const own = await app.inject({
      method: "PATCH",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${demo.json().token}` },
      payload: {
        password: "Another-password-2026!",
        currentPassword: password,
      },
    });
    expect(own.statusCode).toBe(403);
    expect(own.json().error.code).toBe("DEMO_ACCOUNT_LOCKED");
    const byAdmin = await app.inject({
      method: "PATCH",
      url: `/api/v1/users/${demo.json().user.id}`,
      headers: bearer(0),
      payload: { isActive: false },
    });
    expect(byAdmin.statusCode).toBe(403);
    // Public demo credentials must not lock reviewers out through the per-email limit.
    for (let i = 0; i < 12; i++) {
      const attempt = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: lockedEmail, password: "wrong-password-123" },
      });
      expect(attempt.statusCode).toBe(401);
    }
    await db.user.delete({ where: { email: lockedEmail } });
  }, 30000); // 12 Argon2 verifications are deliberately slow.
  it("rejects whitespace-only edits after normalization", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/reports",
      headers: bearer(),
      payload: { ...reportBody(), clientRequestId: randomUUID() },
    });
    const { clientRequestId: _requestId, ...input } = reportBody();
    const response = await app.inject({
      method: "PUT",
      url: `/api/v1/reports/${created.json().id}`,
      headers: bearer(),
      payload: { ...input, title: "   ", version: 1 },
    });
    expect(response.statusCode).toBe(400);
  });
  it("treats large numeric searches as text instead of overflowing Int32", async () => {
    const response = await app.inject({
      url: "/api/v1/reports?q=2147483648",
      headers: bearer(),
    });
    expect(response.statusCode).toBe(200);
    const dashboard = await app.inject({
      url: "/api/v1/dashboard?q=999999999999",
      headers: bearer(),
    });
    expect(dashboard.statusCode).toBe(200);
  });
  it("counts concurrent and failed inference attempts toward its persisted limit", async () => {
    const transport = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Model unavailable"));
    try {
      const responses = await Promise.all(
        Array.from({ length: 11 }, () =>
          app.inject({
            method: "POST",
            url: "/api/v1/predictions",
            headers: bearer(),
            payload: { uploadId },
          }),
        ),
      );
      expect(responses.filter((r) => r.statusCode === 503)).toHaveLength(10);
      expect(responses.filter((r) => r.statusCode === 429)).toHaveLength(1);
      expect(transport).toHaveBeenCalledTimes(10);
    } finally {
      transport.mockRestore();
    }
  });
  it("deactivation revokes existing sessions immediately", async () => {
    const other = await db.user.findUniqueOrThrow({
      where: { email: accounts[2]!.email },
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/users/${other.id}`,
      headers: bearer(0),
      payload: { isActive: false },
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(
      (await app.inject({ url: "/api/v1/auth/me", headers: bearer(2) }))
        .statusCode,
    ).toBe(401);
  });
  it("cannot remove the final administrator", async () => {
    const admin = await db.user.findUniqueOrThrow({
      where: { email: accounts[0]!.email },
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/users/${admin.id}`,
      headers: bearer(0),
      payload: { role: "USER" },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe("LAST_ADMIN");
    expect(
      (await app.inject({ url: "/api/v1/users", headers: bearer(0) }))
        .statusCode,
    ).toBe(200);
  });
  it("allows pending owner edits/deletion, detects stale versions, and expires sessions", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/reports",
      headers: bearer(),
      payload: { ...reportBody(), clientRequestId: randomUUID() },
    });
    const id = created.json().id;
    const { clientRequestId: _requestId, ...input } = reportBody();
    const edit = await app.inject({
      method: "PUT",
      url: `/api/v1/reports/${id}`,
      headers: bearer(),
      payload: { ...input, title: "Judul yang diperbarui", version: 1 },
    });
    expect(edit.statusCode, edit.body).toBe(200);
    expect(edit.json().version).toBe(2);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/v1/reports/${id}`,
          headers: bearer(),
          payload: { version: 1 },
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/v1/reports/${id}`,
          headers: bearer(),
          payload: { version: 2 },
        })
      ).statusCode,
    ).toBe(204);
    expect(
      (await app.inject({ url: `/api/v1/reports/${id}`, headers: bearer() }))
        .statusCode,
    ).toBe(404);
    const { tokenHash } = await import("../src/auth.js");
    await db.session.updateMany({
      where: { tokenHash: tokenHash(tokens[1]!) },
      data: { expiresAt: new Date(0) },
    });
    expect(
      (await app.inject({ url: "/api/v1/auth/me", headers: bearer() }))
        .statusCode,
    ).toBe(401);
  });
});
