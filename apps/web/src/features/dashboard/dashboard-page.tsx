import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FilePlus2, Plus } from "lucide-react";
import type { Page, Report, Statistics } from "@bilcode/contracts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { EmptyState, ErrorState } from "@/components/states";
import { useAuth } from "@/app/auth";
import { api, queryKeys } from "@/lib/api";
import { firstName } from "@/lib/format";
import { useDocumentTitle } from "@/lib/use-document-title";
import { ReportListItem } from "../reports/report-list-item";
import { CategoryBreakdown } from "./category-breakdown";
import { InsightCards } from "./insight-cards";
import { KpiStrip } from "./kpi-strip";
import { TrendChart } from "./trend-chart";

const ReportMap = lazy(() => import("@/components/report-map"));
const recentParams = "pageSize=6";
const mapParams = "pageSize=50";

export default function DashboardPage() {
  useDocumentTitle("Ringkasan");
  const { user } = useAuth();
  const admin = user?.role === "ADMIN";
  const stats = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.request<Statistics>("/dashboard"),
  });
  const recent = useQuery({
    queryKey: queryKeys.reports(recentParams),
    queryFn: () => api.request<Page<Report>>(`/reports?${recentParams}`),
  });
  const mapped = useQuery({
    queryKey: queryKeys.reports(mapParams),
    queryFn: () => api.request<Page<Report>>(`/reports?${mapParams}`),
  });

  if (stats.error)
    return <ErrorState error={stats.error} onRetry={() => stats.refetch()} />;
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          admin
            ? "Ringkasan penanganan"
            : `Halo, ${firstName(user?.name ?? "")}`
        }
        description={
          admin
            ? "Pantau laporan yang masuk, status penanganan, dan sebaran lokasinya."
            : "Ringkasan laporan yang kamu kirim dan perkembangan penanganannya."
        }
        actions={
          <Button asChild>
            <Link to="/reports/new">
              <Plus aria-hidden /> Buat laporan
            </Link>
          </Button>
        }
      />
      <KpiStrip stats={stats.data} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title="Laporan masuk per hari"
          description="30 hari terakhir, waktu Indonesia Barat"
        >
          <TrendChart trend={stats.data?.trend} />
        </Panel>
        <Panel
          title="Komposisi kategori"
          description="Kategori final setelah dikonfirmasi pelapor"
        >
          <CategoryBreakdown stats={stats.data} />
        </Panel>
      </div>
      <InsightCards stats={stats.data} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Panel
          title="Laporan terbaru"
          bodyClassName="px-3 pb-3 pt-2"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/reports">
                Lihat semua <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        >
          {recent.isPending ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recent.error ? (
            <ErrorState error={recent.error} onRetry={() => recent.refetch()} />
          ) : recent.data.items.length === 0 ? (
            <EmptyState
              icon={FilePlus2}
              title="Belum ada laporan"
              description="Laporan pertama akan muncul di sini setelah dikirim."
              action={
                <Button asChild size="sm">
                  <Link to="/reports/new">Buat laporan</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-1">
              {recent.data.items.map((report) => (
                <li key={report.id}>
                  <ReportListItem report={report} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel
          title="Sebaran lokasi"
          description="Hingga 50 laporan terbaru, warna pin mengikuti kategori"
          bodyClassName="p-3"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/reports/map">
                Buka peta <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        >
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <ReportMap reports={mapped.data?.items ?? []} className="h-96" />
          </Suspense>
        </Panel>
      </div>
    </div>
  );
}
