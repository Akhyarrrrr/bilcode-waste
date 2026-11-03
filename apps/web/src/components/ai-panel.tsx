import { Sparkles, TriangleAlert } from "lucide-react";
import {
  categories,
  categoryLabels,
  type Category,
  type Prediction,
} from "@bilcode/contracts";
import { scoreFormat } from "@/lib/format";
import { cn } from "@/lib/utils";
import { categoryStyle } from "./report-badges";

/** Below this the UI asks the reporter to double-check the category. */
export const LOW_CONFIDENCE = 0.6;

export function ConfidenceBars({
  scores,
  highlight,
}: {
  scores: Record<Category, number>;
  highlight?: Category;
}) {
  const sorted = [...categories].sort((a, b) => scores[b] - scores[a]);
  return (
    <ul className="space-y-2.5" aria-label="Probabilitas tiap kategori">
      {sorted.map((category) => {
        const value = scores[category];
        const Icon = categoryStyle[category].icon;
        return (
          <li key={category} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5",
                  category === highlight
                    ? "font-semibold"
                    : "text-muted-foreground",
                )}
              >
                <Icon
                  className={cn("size-4", categoryStyle[category].text)}
                  aria-hidden
                />
                {categoryLabels[category]}
              </span>
              <span className="tabular font-medium">
                {scoreFormat.format(value)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full origin-left animate-bar-grow rounded-full"
                style={{
                  width: `${Math.max(value * 100, 1.5)}%`,
                  background: categoryStyle[category].color,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Model result next to the reporter's final choice, for detail pages. */
export function AiPanel({
  prediction,
  finalCategory,
}: {
  prediction: Prediction | null;
  finalCategory: Category;
}) {
  if (!prediction)
    return (
      <p className="text-sm text-muted-foreground">
        Kategori dipilih manual oleh pelapor, tanpa analisis foto.
      </p>
    );
  const agreed = prediction.category === finalCategory;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">
            Saran AI: {categoryLabels[prediction.category]}{" "}
            <span className="tabular text-muted-foreground">
              {scoreFormat.format(prediction.confidence)}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            {agreed
              ? "Dikonfirmasi pelapor."
              : `Diubah pelapor menjadi ${categoryLabels[finalCategory]}.`}
          </p>
        </div>
      </div>
      <ConfidenceBars
        scores={prediction.scores}
        highlight={prediction.category}
      />
      {prediction.confidence < LOW_CONFIDENCE && (
        <p className="flex items-start gap-2 rounded-lg bg-status-pending-bg px-3 py-2 text-sm text-status-pending">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Keyakinan model rendah. Periksa foto sebelum menindaklanjuti.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Model {prediction.modelVersion}, inferensi{" "}
        {Math.round(prediction.durationMs)} ms
      </p>
    </div>
  );
}
