import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, MapPin } from "lucide-react";
import { reportCode, type Report } from "@bilcode/contracts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryBadge, StatusBadge } from "@/components/report-badges";
import { dateTime, relativeTime } from "@/lib/format";
import { ReportListItem } from "./report-list-item";

/** Table from md up; stacked rows below so nothing scrolls sideways on phones. */
export function ReportsTable({
  reports,
  showReporter,
}: {
  reports: Report[];
  showReporter: boolean;
}) {
  const navigate = useNavigate();
  return (
    <>
      <ul className="space-y-1 p-2 md:hidden">
        {reports.map((report) => (
          <li key={report.id}>
            <ReportListItem report={report} />
          </li>
        ))}
      </ul>
      <Table className="hidden md:table">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">Laporan</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead className="hidden lg:table-cell">Lokasi</TableHead>
            {showReporter && <TableHead>Pelapor</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead>Dikirim</TableHead>
            <TableHead className="w-10 pr-5">
              <span className="sr-only">Buka</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((r) => (
            <TableRow
              key={r.id}
              className="cursor-pointer"
              onClick={(event) => {
                // Let the real link handle modified clicks (new tab) itself.
                if (!(event.target as HTMLElement).closest("a"))
                  navigate(`/reports/${r.id}`);
              }}
            >
              <TableCell className="pl-5">
                <div className="flex items-center gap-3">
                  <img
                    src={r.photo.url}
                    alt=""
                    loading="lazy"
                    className="size-11 shrink-0 rounded-lg bg-muted object-cover"
                  />
                  <div className="min-w-0">
                    <Link
                      to={`/reports/${r.id}`}
                      className="line-clamp-1 max-w-72 font-semibold hover:underline"
                    >
                      {r.title}
                    </Link>
                    <p className="tabular text-xs text-muted-foreground">
                      {reportCode(r.number)}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <CategoryBadge category={r.category} />
              </TableCell>
              <TableCell className="hidden max-w-56 lg:table-cell">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{r.locationLabel}</span>
                </span>
              </TableCell>
              {showReporter && (
                <TableCell className="max-w-40 truncate">
                  {r.reporter.name}
                </TableCell>
              )}
              <TableCell>
                <StatusBadge status={r.status} />
              </TableCell>
              <TableCell>
                <time
                  dateTime={r.createdAt}
                  title={dateTime(r.createdAt)}
                  className="whitespace-nowrap text-muted-foreground"
                >
                  {relativeTime(r.createdAt)}
                </time>
              </TableCell>
              <TableCell className="pr-5 text-muted-foreground">
                <ChevronRight className="size-4" aria-hidden />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
