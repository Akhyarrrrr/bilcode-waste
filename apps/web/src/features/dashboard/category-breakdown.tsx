import { Link } from "react-router-dom";
import {
  categories,
  categoryLabels,
  type Statistics,
} from "@bilcode/contracts";
import { Skeleton } from "@/components/ui/skeleton";
import { categoryStyle } from "@/components/report-badges";
import { numberFormat, percentFormat } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Direct-labelled bars per category; identity never relies on colour alone. */
export function CategoryBreakdown({ stats }: { stats?: Statistics }) {
  if (!stats)
    return (
      <div className="space-y-5">
        {categories.map((c) => (
          <Skeleton key={c} className="h-10 w-full" />
        ))}
      </div>
    );
  const total = Object.values(stats.categories).reduce((a, b) => a + b, 0);
  const sorted = [...categories].sort(
    (a, b) => stats.categories[b] - stats.categories[a],
  );
  return (
    <ul className="space-y-5">
      {sorted.map((category) => {
        const count = stats.categories[category];
        const share = total ? count / total : 0;
        const { icon: Icon, text, color } = categoryStyle[category];
        return (
          <li key={category}>
            <Link
              to={`/reports?category=${category}`}
              className="group block space-y-2 rounded-lg outline-offset-4"
            >
              <span className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium group-hover:underline">
                  <Icon className={cn("size-4", text)} aria-hidden />
                  {categoryLabels[category]}
                </span>
                <span className="text-muted-foreground">
                  <span className="tabular font-semibold text-foreground">
                    {numberFormat.format(count)}
                  </span>{" "}
                  ({percentFormat.format(share)})
                </span>
              </span>
              <span className="block h-2.5 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full origin-left rounded-full"
                  style={{
                    width: `${share * 100}%`,
                    background: color,
                  }}
                />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
