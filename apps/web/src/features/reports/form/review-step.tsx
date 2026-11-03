import { Crosshair, MapPin } from "lucide-react";
import { categoryLabels } from "@bilcode/contracts";
import { CategoryBadge } from "@/components/report-badges";
import { coordinates, scoreFormat } from "@/lib/format";
import type { ReportDraft } from "./use-report-draft";

export function ReviewStep({ draft }: { draft: ReportDraft }) {
  const { details, position, category, prediction, preview, accuracy } = draft;
  if (!category || !position) return null;
  return (
    <div className="grid gap-6 rounded-xl border bg-card p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <img
        src={preview}
        alt="Foto yang akan dikirim"
        className="aspect-[4/3] w-full rounded-lg border object-cover"
      />
      <dl className="space-y-4 text-sm">
        <div className="space-y-1">
          <dt className="text-muted-foreground">Judul</dt>
          <dd className="text-base font-semibold">{details.title.trim()}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground">Kategori</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={category} />
            <span className="text-muted-foreground">
              {prediction
                ? prediction.category === category
                  ? `sesuai saran AI (${scoreFormat.format(prediction.confidence)})`
                  : `diubah dari saran AI ${categoryLabels[prediction.category]}`
                : "dipilih manual"}
            </span>
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground">Deskripsi</dt>
          <dd className="leading-relaxed whitespace-pre-line">
            {details.description.trim()}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground">Lokasi</dt>
          <dd className="space-y-1">
            <span className="flex items-center gap-2 font-medium">
              <MapPin className="size-4" aria-hidden />
              {details.locationLabel.trim()}
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <Crosshair className="size-4" aria-hidden />
              <span className="tabular">
                {coordinates(position[0], position[1])}
              </span>
              {accuracy !== null && `(±${Math.round(accuracy)} m)`}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
