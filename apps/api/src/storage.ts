import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { put, get, del } from "@vercel/blob";
import { config } from "./config.js";
import { HttpError } from "./errors.js";

// Production stores photos in private Vercel Blob; local development and tests use a folder on disk.
const STORAGE_KEY = /^[a-f0-9-]+\.webp$/;
const URL_TTL_SECONDS = 600;

export async function storeImage(bytes: Buffer) {
  const key = `${randomUUID()}.webp`;
  if (config.storage === "vercel-blob") {
    await put(key, bytes, {
      access: "private",
      token: config.blobToken,
      contentType: "image/webp",
      addRandomSuffix: false,
      allowOverwrite: false,
    });
  } else {
    await mkdir(config.storageDir, { recursive: true });
    await writeFile(join(config.storageDir, key), bytes, { flag: "wx" });
  }
  return key;
}

export async function removeImage(key: string) {
  if (!STORAGE_KEY.test(key)) throw new Error("Invalid storage key");
  if (config.storage === "vercel-blob")
    await del(key, { token: config.blobToken });
  else await unlink(join(config.storageDir, key));
}

export async function imageBytes(key: string) {
  if (!STORAGE_KEY.test(key)) throw new Error("Invalid storage key");
  if (config.storage === "vercel-blob") {
    const result = await get(key, {
      access: "private",
      token: config.blobToken,
    });
    if (!result || result.statusCode !== 200)
      throw new HttpError(
        503,
        "STORAGE_UNAVAILABLE",
        "Foto belum dapat dibaca.",
      );
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }
  return readFile(join(config.storageDir, key));
}

const signature = (id: string, expires: number) =>
  createHmac("sha256", config.secret).update(`${id}:${expires}`).digest("hex");

/** Short-lived HMAC-signed URL; the photo itself is never public. */
export async function imageUrl(upload: { id: string }) {
  const expires = Math.floor(Date.now() / 1000) + URL_TTL_SECONDS;
  return `${config.apiUrl}/api/v1/uploads/${upload.id}/image?expires=${expires}&signature=${signature(upload.id, expires)}`;
}

export function validImageSignature(
  id: string,
  expires: number,
  candidate: string,
) {
  if (
    !Number.isInteger(expires) ||
    expires < Date.now() / 1000 ||
    expires > Date.now() / 1000 + URL_TTL_SECONDS + 1 ||
    !/^[a-f0-9]{64}$/.test(candidate)
  )
    return false;
  return timingSafeEqual(
    Buffer.from(candidate),
    Buffer.from(signature(id, expires)),
  );
}
