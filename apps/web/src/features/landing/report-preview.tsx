import { CircleCheck, Clock, MapPin, Truck } from "lucide-react";
import { ConfidenceBars } from "@/components/ai-panel";
import { CategoryBadge, StatusBadge } from "@/components/report-badges";
import { cn } from "@/lib/utils";

// Real model output for this demo photo (apps/api/prisma/demo-images/catalog.json, plastic-07).
const scores = { ORGANIC: 0.00026, PLASTIC: 0.999734, PAPER: 0.000006 };

const steps = [
  { icon: Clock, label: "Laporan diterima", time: "08.12" },
  { icon: Truck, label: "Diproses petugas", time: "10.40" },
  { icon: CircleCheck, label: "Area sudah bersih", time: "Besok, 07.55" },
];

/** Static walk-through of one demo report, used on the landing and auth pages. */
export function ReportPreview({ className }: { className?: string }) {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xl shadow-zinc-900/5",
        className,
      )}
    >
      <div className="grid gap-0 sm:grid-cols-[1fr_1.1fr]">
        <div className="relative aspect-[4/3] sm:aspect-auto">
          <img
            src="/images/samples/plastic-07.webp"
            alt="Foto botol plastik di atas pasir"
            className="absolute inset-0 size-full object-cover"
          />
        </div>
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status="COMPLETED" />
            <CategoryBadge category="PLASTIC" />
          </div>
          <div>
            <p className="font-semibold leading-snug">
              Botol plastik terdampar di Pantai Ulee Lheue
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden /> Meuraxa, Banda Aceh
            </p>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="mb-2.5 text-xs font-semibold text-muted-foreground">
              Analisis foto
            </p>
            <ConfidenceBars scores={scores} highlight="PLASTIC" />
          </div>
        </div>
      </div>
      <ol className="grid border-t sm:grid-cols-3">
        {steps.map(({ icon: Icon, label, time }, index) => (
          <li
            key={label}
            className={cn(
              "flex items-center gap-2.5 px-5 py-3 text-sm",
              index > 0 && "border-t sm:border-t-0 sm:border-l",
            )}
          >
            <Icon className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0">
              <span className="block truncate font-medium">{label}</span>
              <span className="block text-xs text-muted-foreground">
                {time}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <figcaption className="sr-only">
        Contoh laporan dari data demo: foto, saran kategori dari model, dan
        riwayat penanganan.
      </figcaption>
    </figure>
  );
}
