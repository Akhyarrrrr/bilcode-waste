import { Link } from "react-router-dom";
import { Inbox } from "lucide-react";
import { reportLabels, statuses, type Statistics } from "@bilcode/contracts";
import { Skeleton } from "@/components/ui/skeleton";
import { statusStyle } from "@/components/report-badges";
import { numberFormat } from "@/lib/format";
import { cn } from "@/lib/utils";

const cell =
  "group flex min-w-0 flex-col gap-3 bg-card p-4 transition-colors hover:bg-muted focus-visible:bg-muted sm:p-5";

/** One panel split into cells (1px gaps over a border-coloured grid), each linking to the filtered list. */
export function KpiStrip({ stats }: { stats?: Statistics }) {
  const lastWeek = stats?.trend.slice(-7).reduce((sum, d) => sum + d.count, 0);
  return (
    <section
      aria-label="Jumlah laporan per status"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-5"
    >
      <Link to="/reports" className={cn(cell, "col-span-2 lg:col-span-1")}>
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Inbox className="size-4" aria-hidden /> Total laporan
        </span>
        {stats ? (
          <span className="space-y-1">
            <span className="tabular block text-3xl font-bold tracking-tight">
              {numberFormat.format(stats.total)}
            </span>
            <span className="block text-xs text-muted-foreground">
              {numberFormat.format(lastWeek ?? 0)} masuk dalam 7 hari terakhir
            </span>
          </span>
        ) : (
          <Skeleton className="h-12 w-24" />
        )}
      </Link>
      {statuses.map((status) => {
        const { icon: Icon, className } = statusStyle[status];
        return (
          <Link key={status} to={`/reports?status=${status}`} className={cell}>
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full",
                  className,
                )}
              >
                <Icon className="size-3.5" aria-hidden />
              </span>
              {reportLabels[status]}
            </span>
            {stats ? (
              <span className="tabular text-3xl font-bold tracking-tight">
                {numberFormat.format(stats.counts[status])}
              </span>
            ) : (
              <Skeleton className="h-9 w-14" />
            )}
          </Link>
        );
      })}
    </section>
  );
}
