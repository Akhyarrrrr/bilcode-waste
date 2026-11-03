const timeZone = "Asia/Jakarta";
const dateTimeFormat = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone,
});
const dateFormat = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone,
});
const todayFormat = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone,
});

/** "3 Nov 2026, 07.05 WIB" */
export const dateTime = (iso: string) =>
  `${dateTimeFormat.format(new Date(iso))} WIB`;

/** "Selasa, 3 November" in WIB. */
export const today = (now = new Date()) => todayFormat.format(now);

export function relativeTime(iso: string, now = Date.now()) {
  const minutes = Math.floor((now - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return dateFormat.format(new Date(iso));
}

/** Indonesian decimal comma: 0.998 -> "99,8%". */
export const percent = (value: number) =>
  `${(value * 100).toFixed(1).replace(".", ",")}%`;

export const coordinates = (latitude: number, longitude: number) =>
  `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

export const mapsUrl = (latitude: number, longitude: number) =>
  `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
