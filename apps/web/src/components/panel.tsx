import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Bordered section with a heading; panels never carry a shadow (see docs/DESIGN.md). */
export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn("flex flex-col rounded-xl border bg-card", className)}
    >
      <header className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="min-w-0 space-y-0.5">
          <h2 id={id} className="text-base font-semibold">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </header>
      <div className={cn("flex-1 p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
