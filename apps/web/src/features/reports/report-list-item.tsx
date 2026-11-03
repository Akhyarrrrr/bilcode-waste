import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { reportCode, type Report } from "@bilcode/contracts";
import { CategoryBadge, StatusBadge } from "@/components/report-badges";
import { relativeTime } from "@/lib/format";

/** Compact row used on the dashboard and in narrow layouts. */
export function ReportListItem({ report }: { report: Report }) {
  return (
    <Link
      to={`/reports/${report.id}`}
      className="flex gap-3 rounded-lg p-2 transition-colors hover:bg-muted focus-visible:bg-muted"
    >
      <img
        src={report.photo.url}
        alt=""
        loading="lazy"
        className="size-16 shrink-0 rounded-lg bg-muted object-cover"
      />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex items-start justify-between gap-2">
          <span className="line-clamp-1 text-sm font-semibold">
            {report.title}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {relativeTime(report.createdAt)}
          </span>
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{report.locationLabel}</span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <StatusBadge status={report.status} />
          <CategoryBadge category={report.category} />
          <span className="tabular text-xs text-muted-foreground">
            {reportCode(report.number)}
          </span>
        </span>
      </span>
    </Link>
  );
}
