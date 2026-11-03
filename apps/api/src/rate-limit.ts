import { createHash } from "node:crypto";
import { db } from "./db.js";
import { HttpError } from "./errors.js";
export async function consumeRateLimit(
  scope: string,
  limit: number,
  windowMs: number,
) {
  const key = createHash("sha256").update(scope).digest("hex");
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
    const count = await tx.authAttempt.count({
      where: { key, createdAt: { gt: new Date(Date.now() - windowMs) } },
    });
    if (count >= limit)
      throw new HttpError(
        429,
        "RATE_LIMITED",
        `Batas permintaan tercapai. Coba kembali setelah ${Math.ceil(windowMs / 60000)} menit.`,
      );
    await tx.authAttempt.create({ data: { key } });
    await tx.authAttempt.deleteMany({
      where: { key, createdAt: { lt: new Date(Date.now() - 86400000) } },
    });
  });
}
