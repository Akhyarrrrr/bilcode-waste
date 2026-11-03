import type { Report, StatusEvent } from "@bilcode/contracts";
import { dayKey, dayLabel } from "./format";

export interface ActivityItem {
  event: StatusEvent;
  report: Report;
}

/** Every status change across the reports, newest first. */
export function activityFeed(reports: Report[]): ActivityItem[] {
  return reports
    .flatMap((report) => report.history.map((event) => ({ event, report })))
    .sort(
      (a, b) =>
        b.event.createdAt.localeCompare(a.event.createdAt) ||
        b.event.id.localeCompare(a.event.id),
    );
}

/** Splits a newest-first feed into WIB-day sections for a SectionList. */
export function groupByDay(items: ActivityItem[], now = Date.now()) {
  const sections: { key: string; title: string; data: ActivityItem[] }[] = [];
  for (const item of items) {
    const key = dayKey(item.event.createdAt);
    const last = sections.at(-1);
    if (last?.key === key) last.data.push(item);
    else
      sections.push({
        key,
        title: dayLabel(item.event.createdAt, now),
        data: [item],
      });
  }
  return sections;
}

export function activityTitle(event: StatusEvent) {
  switch (event.toStatus) {
    case "PENDING":
      return event.fromStatus ? "Kembali menunggu" : "Laporan terkirim";
    case "IN_PROGRESS":
      return "Sedang diproses petugas";
    case "COMPLETED":
      return "Selesai ditangani";
    case "REJECTED":
      return "Laporan ditolak";
  }
}
