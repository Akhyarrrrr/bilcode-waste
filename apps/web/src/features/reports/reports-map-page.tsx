import { lazy, Suspense } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  categories,
  categoryLabels,
  type Page,
  type Report,
} from "@bilcode/contracts";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/states";
import { categoryStyle } from "@/components/report-badges";
import { api, queryKeys } from "@/lib/api";
import { numberFormat } from "@/lib/format";
import { useDocumentTitle } from "@/lib/use-document-title";
import { ReportFiltersBar } from "./report-filters-bar";
import { filterQuery, useReportFilters } from "./use-report-filters";

const ReportMap = lazy(() => import("@/components/report-map"));
// shortcut: the API caps pages at 100, so the map shows the newest 100; add clustering + bbox paging past that.
const MAP_LIMIT = 100;

export default function ReportsMapPage() {
  useDocumentTitle("Peta laporan");
  const { filters, update, active } = useReportFilters();
  const params = filterQuery({ ...filters, page: 1 }, { pageSize: MAP_LIMIT });
  const reports = useQuery({
    queryKey: queryKeys.reports(params),
    queryFn: () => api.request<Page<Report>>(`/reports?${params}`),
    placeholderData: keepPreviousData,
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Peta laporan"
        description="Sebaran lokasi laporan. Klik pin untuk melihat foto dan status."
      />
      <ReportFiltersBar filters={filters} update={update} active={active} />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="text-muted-foreground">
          {reports.data
            ? `${numberFormat.format(reports.data.items.length)} dari ${numberFormat.format(reports.data.total)} laporan ditampilkan`
            : "Memuat laporan…"}
        </span>
        <ul className="flex flex-wrap gap-4" aria-label="Keterangan warna pin">
          {categories.map((c) => (
            <li key={c} className="flex items-center gap-1.5">
              <span
                className="size-3 rounded-full"
                style={{ background: categoryStyle[c].color }}
                aria-hidden
              />
              {categoryLabels[c]}
            </li>
          ))}
        </ul>
      </div>
      {reports.error ? (
        <ErrorState error={reports.error} onRetry={() => reports.refetch()} />
      ) : (
        <div className="h-[calc(100svh-18rem)] min-h-[28rem] overflow-hidden rounded-xl border">
          <Suspense fallback={<Skeleton className="size-full" />}>
            <ReportMap
              reports={reports.data?.items ?? []}
              className="h-full rounded-none"
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
