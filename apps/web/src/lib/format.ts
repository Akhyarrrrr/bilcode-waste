import { MAX_IMAGE_BYTES } from "@bilcode/contracts";

const zone = "Asia/Jakarta";
const dateTimeFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: zone,
});
const shortDateFormat = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  timeZone: zone,
});
const relativeFormat = new Intl.RelativeTimeFormat("id-ID", {
  numeric: "auto",
});
export const numberFormat = new Intl.NumberFormat("id-ID");
export const percentFormat = new Intl.NumberFormat("id-ID", {
  style: "percent",
  maximumFractionDigits: 1,
});
/** Model scores keep two decimals so 0.9997 reads as 99,97% instead of a rounded 100%. */
export const scoreFormat = new Intl.NumberFormat("id-ID", {
  style: "percent",
  maximumFractionDigits: 2,
});

/** "3 Nov 2026, 14.05" in WIB. */
export const dateTime = (iso: string) =>
  `${dateTimeFormat.format(new Date(iso))} WIB`;
export const shortDate = (iso: string) => shortDateFormat.format(new Date(iso));

/** "2 jam lalu" for recent items, falling back to a date after a week. */
export function relativeTime(iso: string, now = Date.now()) {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60000);
  if (Math.abs(minutes) < 1) return "baru saja";
  if (Math.abs(minutes) < 60) return relativeFormat.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeFormat.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) <= 7) return relativeFormat.format(days, "day");
  return shortDate(iso);
}

/** "1 hari 4 jam" style duration for average handling time. */
export function duration(hours: number) {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} menit`;
  if (hours < 24) return `${Math.round(hours)} jam`;
  const days = Math.floor(hours / 24);
  const rest = Math.round(hours - days * 24);
  return rest ? `${days} hari ${rest} jam` : `${days} hari`;
}

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export const mapsLink = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;

export const coordinates = (lat: number, lng: number) =>
  `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

/** Resize to ≤1600 px JPEG in the browser so uploads stay under the API limit. */
export async function compressPhoto(file: File): Promise<File> {
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Foto sumber maksimal 20 MB. Pilih foto yang lebih kecil.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Pilih foto JPEG, PNG, atau WebP.");
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Browser belum mendukung pengolahan foto.");
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Foto tidak dapat diproses."))),
      "image/jpeg",
      0.82,
    ),
  );
  if (blob.size > MAX_IMAGE_BYTES)
    throw new Error(
      "Foto masih terlalu besar. Pilih foto dengan detail lebih sedikit.",
    );
  return new File([blob], "report.jpg", { type: "image/jpeg" });
}
