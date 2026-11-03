import { cn } from "@/lib/utils";
import { BILCODE_GLYPH, BILCODE_WORD } from "./bilcode-paths";

/** Official Bilcode mark in currentColor, followed by the product word. */
export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox={compact ? "0 0 148 125" : "0 0 381 147"}
        className={cn("h-6 w-auto shrink-0", compact && "h-7")}
        aria-hidden
      >
        <path d={BILCODE_GLYPH} fill="currentColor" />
        {!compact && <path d={BILCODE_WORD} fill="currentColor" />}
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-primary">
        Waste
      </span>
      <span className="sr-only">Bilcode Waste</span>
    </span>
  );
}
