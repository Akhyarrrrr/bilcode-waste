import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { Statistics } from "@bilcode/contracts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { numberFormat } from "@/lib/format";

const config = {
  count: { label: "Laporan masuk", color: "var(--primary)" },
} satisfies ChartConfig;

const dayLabel = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
// Trend dates are already WIB calendar days ("2026-11-03"); format them as plain dates.
const label = (date: string) => dayLabel.format(new Date(`${date}T00:00:00Z`));

/** Daily submissions for the last 30 WIB days; a single series, so no legend. */
export function TrendChart({ trend }: { trend?: Statistics["trend"] }) {
  if (!trend) return <Skeleton className="h-56 w-full" />;
  const total = trend.reduce((sum, d) => sum + d.count, 0);
  const peak = Math.max(...trend.map((d) => d.count));
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        <span className="tabular font-semibold text-foreground">
          {numberFormat.format(total)}
        </span>{" "}
        laporan dalam 30 hari, terbanyak{" "}
        <span className="tabular font-semibold text-foreground">{peak}</span>{" "}
        per hari.
      </p>
      <ChartContainer
        config={config}
        className="aspect-auto h-56 w-full"
        aria-label={`Grafik batang laporan harian 30 hari terakhir, total ${total}`}
        role="img"
      >
        <BarChart data={trend} margin={{ left: -20, right: 4, top: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={6}
            tickFormatter={label}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)" }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  payload[0] ? label(String(payload[0].payload.date)) : ""
                }
              />
            }
          />
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
