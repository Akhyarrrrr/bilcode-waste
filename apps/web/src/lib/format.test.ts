import { describe, expect, it } from "vitest";
import { duration, initials, relativeTime, scoreFormat } from "./format";
import { filterQuery } from "@/features/reports/use-report-filters";

describe("format helpers", () => {
  const now = Date.parse("2026-11-03T10:00:00Z");

  it("describes recent times relatively and older ones by date", () => {
    expect(relativeTime("2026-11-03T09:59:40Z", now)).toBe("baru saja");
    expect(relativeTime("2026-11-03T08:00:00Z", now)).toBe("2 jam yang lalu");
    expect(relativeTime("2026-10-20T10:00:00Z", now)).toBe("20 Okt");
  });

  it("formats handling time in hours and days", () => {
    expect(duration(0.25)).toBe("15 menit");
    expect(duration(5.4)).toBe("5 jam");
    expect(duration(28)).toBe("1 hari 4 jam");
    expect(duration(48)).toBe("2 hari");
  });

  it("keeps two decimals on model scores so 0.9997 is not shown as 100%", () => {
    expect(scoreFormat.format(0.999734)).toBe("99,97%");
  });

  it("builds avatar initials from up to two words", () => {
    expect(initials("cut nyak dhien")).toBe("CN");
    expect(initials("   ")).toBe("U");
  });

  it("drops status from the scope query used for tab totals", () => {
    const filters = {
      q: " botol ",
      status: "PENDING" as const,
      category: "PLASTIC" as const,
      from: "2026-10-01",
      to: "",
      page: 2,
    };
    expect(filterQuery(filters, { pageSize: 12 })).toBe(
      "q=botol&status=PENDING&category=PLASTIC&from=2026-10-01&page=2&pageSize=12",
    );
    expect(filterQuery(filters, { withStatus: false })).toBe(
      "q=botol&category=PLASTIC&from=2026-10-01",
    );
  });
});
