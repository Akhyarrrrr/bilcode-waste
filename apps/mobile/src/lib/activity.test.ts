import { describe, expect, it } from "vitest";
import type { Report, StatusEvent } from "@bilcode/contracts";
import { activityFeed, activityTitle, groupByDay } from "./activity";

const actor = { id: "u1", name: "Admin Bilcode" };
const event = (
  id: string,
  createdAt: string,
  toStatus: StatusEvent["toStatus"],
  fromStatus: StatusEvent["fromStatus"] = null,
): StatusEvent => ({ id, createdAt, toStatus, fromStatus, note: null, actor });
// Only the fields the feed reads; the rest of the DTO is irrelevant here.
const report = (id: string, history: StatusEvent[]) =>
  ({ id, history }) as unknown as Report;

describe("activity feed", () => {
  const reports = [
    report("r1", [
      event("e1", "2026-11-01T02:00:00Z", "PENDING"),
      event("e3", "2026-11-03T03:00:00Z", "IN_PROGRESS", "PENDING"),
    ]),
    report("r2", [event("e2", "2026-11-02T20:00:00Z", "PENDING")]),
  ];

  it("flattens every report's history newest first", () => {
    const feed = activityFeed(reports);
    expect(feed.map((item) => item.event.id)).toEqual(["e3", "e2", "e1"]);
    expect(feed[0]?.report.id).toBe("r1");
  });

  it("groups by WIB calendar day, not UTC", () => {
    const now = Date.parse("2026-11-03T05:00:00Z");
    const sections = groupByDay(activityFeed(reports), now);
    // e2 is 2 Nov 20:00 UTC = 3 Nov 03:00 WIB, so it joins today.
    expect(sections.map((s) => [s.title, s.data.length])).toEqual([
      ["Hari ini", 2],
      ["Minggu, 1 Nov", 1],
    ]);
    const yesterday = groupByDay(activityFeed(reports), now + 86_400_000);
    expect(yesterday[0]?.title).toBe("Kemarin");
  });

  it("titles submissions apart from staff updates", () => {
    expect(activityTitle(event("a", "", "PENDING"))).toBe("Laporan terkirim");
    expect(activityTitle(event("b", "", "PENDING", "IN_PROGRESS"))).toBe(
      "Kembali menunggu",
    );
    expect(activityTitle(event("c", "", "REJECTED", "PENDING"))).toBe(
      "Laporan ditolak",
    );
  });
});
