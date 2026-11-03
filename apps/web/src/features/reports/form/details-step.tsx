import { lazy, Suspense } from "react";
import { Crosshair, Loader2, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/field";
import { coordinates } from "@/lib/format";
import type { DetailErrors, ReportDraft } from "./use-report-draft";

const ReportMap = lazy(() => import("@/components/report-map"));

export function DetailsStep({
  draft,
  errors,
}: {
  draft: ReportDraft;
  errors: DetailErrors;
}) {
  const { details, setDetails, position, accuracy, busy } = draft;
  const set = (key: keyof typeof details) => (value: string) =>
    setDetails((d) => ({ ...d, [key]: value }));
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Field label="Judul laporan" error={errors.title}>
          {(props) => (
            <Input
              {...props}
              value={details.title}
              maxLength={120}
              placeholder="Contoh: Botol plastik menumpuk di tepi pantai"
              onChange={(e) => set("title")(e.target.value)}
            />
          )}
        </Field>
        <Field
          label="Deskripsi"
          error={errors.description}
          hint="Jelaskan jumlah, kondisi, dan sejak kapan sampah ada."
        >
          {(props) => (
            <Textarea
              {...props}
              rows={5}
              maxLength={2000}
              value={details.description}
              onChange={(e) => set("description")(e.target.value)}
            />
          )}
        </Field>
        <Field label="Nama lokasi atau patokan" error={errors.locationLabel}>
          {(props) => (
            <Input
              {...props}
              value={details.locationLabel}
              maxLength={200}
              placeholder="Contoh: Pantai Ulee Lheue, dekat dermaga"
              onChange={(e) => set("locationLabel")(e.target.value)}
            />
          )}
        </Field>
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Titik lokasi</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={draft.locate}
            disabled={busy === "locating"}
          >
            {busy === "locating" ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <LocateFixed aria-hidden />
            )}
            {busy === "locating" ? "Mencari lokasi…" : "Gunakan lokasi saya"}
          </Button>
        </div>
        <div className="h-72 overflow-hidden rounded-xl border">
          <Suspense fallback={<Skeleton className="size-full" />}>
            <ReportMap
              position={position ?? undefined}
              category={draft.category ?? undefined}
              onPick={draft.pickOnMap}
              className="h-72 rounded-none"
            />
          </Suspense>
        </div>
        <p
          aria-live="polite"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Crosshair className="size-4 shrink-0" aria-hidden />
          {position ? (
            <>
              <span className="tabular">
                {coordinates(position[0], position[1])}
              </span>
              {accuracy !== null
                ? `(GPS ±${Math.round(accuracy)} m)`
                : "(dipilih di peta)"}
            </>
          ) : (
            "Belum ada titik. Klik peta atau gunakan lokasi saat ini."
          )}
        </p>
        {(draft.locationError || errors.position) && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {draft.locationError || errors.position}
          </p>
        )}
      </div>
    </div>
  );
}
