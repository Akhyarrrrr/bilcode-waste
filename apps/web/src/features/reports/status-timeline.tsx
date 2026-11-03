import { reportLabels, type StatusEvent } from "@bilcode/contracts";
import { statusStyle } from "@/components/report-badges";
import { dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Newest event first, each with who changed it, when, and the admin's note. */
export function StatusTimeline({ history }: { history: StatusEvent[] }) {
  const events = [...history].reverse();
  return (
    <ol className="space-y-0">
      {events.map((event, index) => {
        const { icon: Icon, className } = statusStyle[event.toStatus];
        const last = index === events.length - 1;
        return (
          <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && (
              <span
                className="absolute top-8 bottom-0 left-[13px] w-px bg-border"
                aria-hidden
              />
            )}
            <span
              className={cn(
                "relative grid size-7 shrink-0 place-items-center rounded-full",
                className,
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1 pt-0.5">
              <p className="text-sm">
                <span className="font-semibold">
                  {event.fromStatus === null
                    ? "Laporan dikirim"
                    : reportLabels[event.toStatus]}
                </span>{" "}
                <span className="text-muted-foreground">
                  oleh {event.actor.name}
                </span>
              </p>
              <time
                dateTime={event.createdAt}
                className="block text-xs text-muted-foreground"
              >
                {dateTime(event.createdAt)}
              </time>
              {event.note && (
                <p className="rounded-lg bg-muted px-3 py-2 text-sm">
                  {event.note}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
