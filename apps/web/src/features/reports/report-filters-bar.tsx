import { useEffect, useState } from "react";
import { CalendarRange, Search, X } from "lucide-react";
import { categories, categoryLabels } from "@bilcode/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { shortDate } from "@/lib/format";
import type { ReportFilters } from "./use-report-filters";

const ALL = "all";

export function ReportFiltersBar({
  filters,
  update,
  active,
}: {
  filters: ReportFilters;
  update: (patch: Partial<ReportFilters>) => void;
  active: boolean;
}) {
  const [search, setSearch] = useState(filters.q);
  // Keep the box in sync when filters are reset or changed from elsewhere (e.g. back button).
  useEffect(() => setSearch(filters.q), [filters.q]);
  useEffect(() => {
    if (search.trim() === filters.q) return;
    const timer = setTimeout(() => update({ q: search }), 350);
    return () => clearTimeout(timer);
    // `update` is recreated every render; the debounce only tracks the typed text.
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  const range =
    filters.from || filters.to
      ? `${filters.from ? shortDate(filters.from) : "…"} – ${filters.to ? shortDate(filters.to) : "…"}`
      : "Semua tanggal";
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari judul, deskripsi, atau nomor"
          aria-label="Cari laporan"
          className="pl-9"
        />
      </div>
      <Select
        value={filters.category ?? ALL}
        onValueChange={(value) =>
          update({
            category: value === ALL ? undefined : (value as never),
          })
        }
      >
        <SelectTrigger className="w-full sm:w-44" aria-label="Filter kategori">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua kategori</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c} value={c}>
              {categoryLabels[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="justify-start font-normal sm:w-auto"
            aria-label={`Filter tanggal: ${range}`}
          >
            <CalendarRange aria-hidden /> {range}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-3">
          <p className="text-sm font-semibold">Tanggal laporan dikirim</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="filter-from">Dari</Label>
              <Input
                id="filter-from"
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(e) => update({ from: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-to">Sampai</Label>
              <Input
                id="filter-to"
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(e) => update({ to: e.target.value })}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {active && (
        <Button
          variant="ghost"
          onClick={() => {
            setSearch("");
            update({
              q: "",
              status: undefined,
              category: undefined,
              from: "",
              to: "",
            });
          }}
        >
          <X aria-hidden /> Hapus filter
        </Button>
      )}
    </div>
  );
}
