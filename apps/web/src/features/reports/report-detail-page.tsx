import { lazy, Suspense } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Crosshair,
  ExternalLink,
  Expand,
  MapPin,
  Pencil,
  Trash2,
  UserRound,
} from "lucide-react";
import { reportCode, type Report } from "@bilcode/contracts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AiPanel } from "@/components/ai-panel";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Panel } from "@/components/panel";
import { CategoryBadge, StatusBadge } from "@/components/report-badges";
import { ErrorState } from "@/components/states";
import { useAuth } from "@/app/auth";
import { api, queryKeys } from "@/lib/api";
import { coordinates, dateTime, mapsLink, relativeTime } from "@/lib/format";
import { useDocumentTitle } from "@/lib/use-document-title";
import { StatusDialog } from "./status-dialog";
import { StatusTimeline } from "./status-timeline";

const ReportMap = lazy(() => import("@/components/report-map"));

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <Skeleton className="h-8 w-2/3" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Skeleton className="aspect-[4/3] w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function ReportDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.report(id),
    queryFn: () => api.request<Report>(`/reports/${id}`),
  });
  useDocumentTitle(query.data?.title ?? "Detail laporan");
  if (query.isPending) return <DetailSkeleton />;
  if (query.error)
    return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const report = query.data;
  const admin = user?.role === "ADMIN";
  const editable = admin || report.status === "PENDING";
  const remove = async () => {
    await api.request(`/reports/${report.id}`, {
      method: "DELETE",
      body: JSON.stringify({ version: report.version }),
    });
    client.removeQueries({ queryKey: queryKeys.report(report.id) });
    void client.invalidateQueries({ queryKey: ["reports"] });
    void client.invalidateQueries({ queryKey: queryKeys.dashboard });
    toast.success(`${reportCode(report.number)} dihapus.`);
    navigate("/reports", { replace: true });
  };
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/reports">
          <ArrowLeft aria-hidden /> Semua laporan
        </Link>
      </Button>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={report.status} />
            <CategoryBadge category={report.category} />
            <span className="tabular text-sm text-muted-foreground">
              {reportCode(report.number)}, dikirim{" "}
              {relativeTime(report.createdAt)}
            </span>
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">{report.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Button asChild variant="outline">
              <Link to={`/reports/${report.id}/edit`}>
                <Pencil aria-hidden /> Ubah
              </Link>
            </Button>
          )}
          {editable && (
            <ConfirmDialog
              trigger={
                <Button variant="outline">
                  <Trash2 aria-hidden /> Hapus
                </Button>
              }
              title={`Hapus ${reportCode(report.number)}?`}
              description="Laporan akan hilang dari daftar dan statistik. Riwayat statusnya tetap tersimpan untuk audit."
              confirmLabel="Ya, hapus laporan"
              onConfirm={remove}
            />
          )}
          {admin && <StatusDialog report={report} />}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="group relative block w-full overflow-hidden rounded-xl border bg-muted"
                aria-label="Perbesar foto laporan"
              >
                <img
                  src={report.photo.url}
                  alt={`Foto laporan: ${report.title}`}
                  className="aspect-[4/3] w-full object-cover"
                />
                <span className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-lg bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Expand className="size-4" aria-hidden />
                </span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-2 sm:max-w-4xl">
              <DialogTitle className="sr-only">{report.title}</DialogTitle>
              <img
                src={report.photo.url}
                alt={`Foto laporan: ${report.title}`}
                className="max-h-[80svh] w-full rounded-lg object-contain"
              />
            </DialogContent>
          </Dialog>
          <Panel title="Deskripsi">
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {report.description}
            </p>
          </Panel>
          <Panel
            title="Analisis foto"
            description="Saran kategori dari model klasifikasi gambar"
          >
            <AiPanel
              prediction={report.prediction}
              finalCategory={report.category}
            />
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Riwayat penanganan">
            <StatusTimeline history={report.history} />
          </Panel>
          <Panel title="Lokasi" bodyClassName="space-y-3">
            <div className="h-56 overflow-hidden rounded-lg border">
              <Suspense fallback={<Skeleton className="size-full" />}>
                <ReportMap
                  position={[report.latitude, report.longitude]}
                  category={report.category}
                  className="h-56 rounded-none"
                />
              </Suspense>
            </div>
            <p className="flex items-start gap-2 text-sm font-medium">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              {report.locationLabel}
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Crosshair className="size-4 shrink-0" aria-hidden />
              <span className="tabular">
                {coordinates(report.latitude, report.longitude)}
              </span>
              {report.locationAccuracy !== null && (
                <span>(±{Math.round(report.locationAccuracy)} m)</span>
              )}
            </p>
            <Button asChild variant="outline" size="sm">
              <a
                href={mapsLink(report.latitude, report.longitude)}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink aria-hidden /> Buka di Google Maps
              </a>
            </Button>
          </Panel>
          <Panel title="Pelapor" bodyClassName="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
              <UserRound className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 text-sm">
              <p className="truncate font-semibold">{report.reporter.name}</p>
              <p className="text-muted-foreground">
                {report.reporter.id === user?.id
                  ? "Laporan milikmu"
                  : "Pelapor"}
              </p>
              <p className="text-xs text-muted-foreground">
                Terakhir diperbarui {dateTime(report.updatedAt)}
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
