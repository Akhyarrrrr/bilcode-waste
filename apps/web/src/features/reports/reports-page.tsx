import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Download, FileSearch, Plus } from "lucide-react";
import {
  reportLabels,
  statuses,
  type Page,
  type Report,
  type Statistics,
} from "@bilcode/contracts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { EmptyState, ErrorState } from "@/components/states";
import { useAuth } from "@/app/auth";
import { API_BASE, api, queryKeys } from "@/lib/api";
import { numberFormat } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/lib/use-document-title";
import { ReportFiltersBar } from "./report-filters-bar";
import { ReportsTable } from "./reports-table";
import { filterQuery, useReportFilters } from "./use-report-filters";

const PAGE_SIZE = 12;

export default function ReportsPage() {
  useDocumentTitle("Laporan");
  const { user } = useAuth();
  const admin = user?.role === "ADMIN";
  const { filters, update, active } = useReportFilters();
  const listParams = filterQuery(filters, { pageSize: PAGE_SIZE });
  const scopeParams = filterQuery(filters, { withStatus: false });
  const list = useQuery({
    queryKey: queryKeys.reports(listParams),
    queryFn: () => api.request<Page<Report>>(`/reports?${listParams}`),
    placeholderData: keepPreviousData,
  });
  // Same filters minus status, so every tab can show its own total.
  const counts = useQuery({
    queryKey: [...queryKeys.dashboard, scopeParams],
    queryFn: () => api.request<Statistics>(`/dashboard?${scopeParams}`),
    placeholderData: keepPreviousData,
  });
  const tabs = [
    { value: undefined, label: "Semua", count: counts.data?.total },
    ...statuses.map((s) => ({
      value: s,
      label: reportLabels[s],
      count: counts.data?.counts[s],
    })),
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan"
        description={
          admin
            ? "Semua laporan warga. Buka laporan untuk meninjau dan mengubah statusnya."
            : "Laporan yang kamu kirim beserta status penanganannya."
        }
        actions={
          <>
            {admin && (
              <Button asChild variant="outline">
                <a
                  href={`${API_BASE}/reports/export?${filterQuery(filters)}`}
                  download
                >
                  <Download aria-hidden /> Export CSV
                </a>
              </Button>
            )}
            <Button asChild>
              <Link to="/reports/new">
                <Plus aria-hidden /> Buat laporan
              </Link>
            </Button>
          </>
        }
      />
      <ReportFiltersBar filters={filters} update={update} active={active} />
      <section className="overflow-hidden rounded-xl border bg-card">
        <div
          role="group"
          aria-label="Filter status"
          className="flex gap-1 overflow-x-auto border-b px-3 pt-2"
        >
          {tabs.map((tab) => {
            const selected = filters.status === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                aria-pressed={selected}
                onClick={() => update({ status: tab.value })}
                className={cn(
                  "-mb-px flex h-10 shrink-0 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  selected && "border-primary text-foreground",
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="tabular rounded-full bg-muted px-1.5 text-xs">
                    {numberFormat.format(tab.count)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {list.isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title={
              active ? "Tidak ada laporan yang cocok" : "Belum ada laporan"
            }
            description={
              active
                ? "Ubah kata kunci atau hapus filter untuk melihat laporan lain."
                : "Kirim laporan pertama dengan foto dan lokasi sampah."
            }
            action={
              !active && (
                <Button asChild size="sm">
                  <Link to="/reports/new">Buat laporan</Link>
                </Button>
              )
            }
          />
        ) : (
          <div
            className={cn(
              "transition-opacity",
              list.isPlaceholderData && "opacity-60",
            )}
            aria-busy={list.isFetching}
          >
            <ReportsTable reports={list.data.items} showReporter={admin} />
            <Pagination
              page={list.data.page}
              pages={list.data.pages}
              total={list.data.total}
              noun="laporan"
              onPage={(page) => update({ page })}
            />
          </div>
        )}
      </section>
    </div>
  );
}
