import { describe, expect, it } from "vitest";
import {
  dateTime,
  firstName,
  initials,
  percent,
  relativeTime,
  today,
} from "./format";

describe("formatting", () => {
  it("shows times in WIB regardless of device time zone", () => {
    expect(dateTime("2026-11-03T00:05:00Z")).toBe("3 Nov 2026, 07.05 WIB");
    expect(today(new Date("2026-11-03T20:05:00Z"))).toBe("Rabu, 4 November");
  });
  it("uses Indonesian decimal commas for confidence", () => {
    expect(percent(0.998)).toBe("99,8%");
    expect(percent(0.5)).toBe("50,0%");
  });
  it("describes recent times relatively and older ones as a date", () => {
    const now = Date.parse("2026-11-03T12:00:00Z");
    expect(relativeTime("2026-11-03T11:59:40Z", now)).toBe("Baru saja");
    expect(relativeTime("2026-11-03T11:15:00Z", now)).toBe("45 menit lalu");
    expect(relativeTime("2026-11-03T07:00:00Z", now)).toBe("5 jam lalu");
    expect(relativeTime("2026-11-01T12:00:00Z", now)).toBe("2 hari lalu");
    expect(relativeTime("2026-10-01T12:00:00Z", now)).toBe("1 Okt 2026");
  });
  it("derives greeting name and avatar initials", () => {
    expect(firstName("  Akhyar Rahman ")).toBe("Akhyar");
    expect(initials("akhyar rahman putra")).toBe("AR");
    expect(initials("Yar")).toBe("Y");
  });
});
