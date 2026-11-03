import {
  CircleCheck,
  CircleX,
  Clock,
  Leaf,
  Milk,
  Newspaper,
  Truck,
  type LucideIcon,
} from "lucide-react";
import {
  categoryLabels,
  reportLabels,
  type Category,
  type Status,
} from "@bilcode/contracts";
import { cn } from "@/lib/utils";

export const statusStyle: Record<
  Status,
  { icon: LucideIcon; className: string }
> = {
  PENDING: {
    icon: Clock,
    className: "bg-status-pending-bg text-status-pending",
  },
  IN_PROGRESS: {
    icon: Truck,
    className: "bg-status-progress-bg text-status-progress",
  },
  COMPLETED: {
    icon: CircleCheck,
    className: "bg-status-done-bg text-status-done",
  },
  REJECTED: {
    icon: CircleX,
    className: "bg-status-rejected-bg text-status-rejected",
  },
};

export const categoryStyle: Record<
  Category,
  { icon: LucideIcon; swatch: string; text: string; color: string }
> = {
  ORGANIC: {
    icon: Leaf,
    swatch: "bg-cat-organic",
    text: "text-cat-organic",
    color: "var(--cat-organic)",
  },
  PLASTIC: {
    icon: Milk,
    swatch: "bg-cat-plastic",
    text: "text-cat-plastic",
    color: "var(--cat-plastic)",
  },
  PAPER: {
    icon: Newspaper,
    swatch: "bg-cat-paper",
    text: "text-cat-paper",
    color: "var(--cat-paper)",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const { icon: Icon, className: tone } = statusStyle[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">Status: </span>
      {reportLabels[status]}
    </span>
  );
}

export function CategoryBadge({
  category,
  className,
}: {
  category: Category;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border bg-card px-2.5 text-xs font-medium whitespace-nowrap text-foreground",
        className,
      )}
    >
      <span
        className={cn("size-2 rounded-[3px]", categoryStyle[category].swatch)}
        aria-hidden
      />
      <span className="sr-only">Kategori: </span>
      {categoryLabels[category]}
    </span>
  );
}
