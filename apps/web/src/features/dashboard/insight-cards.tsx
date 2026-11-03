import { Sparkles, Timer } from "lucide-react";
import type { Statistics } from "@bilcode/contracts";
import { Skeleton } from "@/components/ui/skeleton";
import { duration, numberFormat, percentFormat } from "@/lib/format";

function Insight({
  icon: Icon,
  title,
  value,
  detail,
}: {
  icon: typeof Sparkles;
  title: string;
  value?: string;
  detail?: string;
}) {
  return (
    <div className="flex gap-4 rounded-xl border bg-card p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {value === undefined ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <p className="tabular text-2xl font-bold tracking-tight">{value}</p>
        )}
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

export function InsightCards({ stats }: { stats?: Statistics }) {
  const ai = stats?.aiAgreement;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Insight
        icon={Sparkles}
        title="Saran AI yang dipakai pelapor"
        value={
          ai
            ? ai.total
              ? percentFormat.format(ai.matched / ai.total)
              : "Belum ada"
            : undefined
        }
        detail={
          ai
            ? `${numberFormat.format(ai.matched)} dari ${numberFormat.format(ai.total)} laporan yang dianalisis memakai kategori saran model.`
            : undefined
        }
      />
      <Insight
        icon={Timer}
        title="Rata-rata waktu sampai selesai"
        value={
          stats
            ? stats.avgResolutionHours === null
              ? "Belum ada"
              : duration(stats.avgResolutionHours)
            : undefined
        }
        detail={
          stats
            ? "Dihitung dari laporan dikirim hingga ditandai selesai."
            : undefined
        }
      />
    </div>
  );
}
