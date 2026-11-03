import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { numberFormat } from "@/lib/format";

export function Pagination({
  page,
  pages,
  total,
  noun,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  noun: string;
  onPage: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Halaman"
      className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm"
    >
      <p className="text-muted-foreground">
        Halaman <span className="tabular">{page}</span> dari{" "}
        <span className="tabular">{Math.max(pages, 1)}</span>
        <span className="hidden sm:inline">
          , {numberFormat.format(total)} {noun}
        </span>
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Halaman sebelumnya"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Halaman berikutnya"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
