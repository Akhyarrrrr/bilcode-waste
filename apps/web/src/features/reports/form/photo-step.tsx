import { useRef, useState } from "react";
import {
  ImagePlus,
  Loader2,
  RefreshCw,
  ScanLine,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { categories, categoryLabels, type Category } from "@bilcode/contracts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ConfidenceBars, LOW_CONFIDENCE } from "@/components/ai-panel";
import { categoryStyle } from "@/components/report-badges";
import { FormError } from "@/components/states";
import { scoreFormat } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReportDraft } from "./use-report-draft";

function Dropzone({ onFile }: { onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={cn(
        "flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-muted/40 p-6 text-center transition-colors hover:border-primary hover:bg-primary-soft/30 has-[:focus-visible]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
        dragging && "border-primary bg-primary-soft/40",
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-card text-primary shadow-sm">
        <ImagePlus className="size-6" aria-hidden />
      </span>
      <span className="space-y-1">
        <span className="block font-semibold">
          Pilih atau tarik foto sampah
        </span>
        <span className="block text-sm text-muted-foreground">
          JPEG, PNG, atau WebP. Di ponsel, kamera akan terbuka.
        </span>
      </span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        aria-label="Pilih foto sampah"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}

export function PhotoStep({ draft }: { draft: ReportDraft }) {
  const replace = useRef<HTMLInputElement>(null);
  const { preview, busy, prediction, analysisError, category, manual } = draft;
  const working = busy === "uploading" || busy === "analyzing";
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        {preview ? (
          <div className="relative overflow-hidden rounded-xl border bg-muted">
            <img
              src={preview}
              alt="Pratinjau foto laporan"
              className="aspect-[4/3] w-full object-cover"
            />
            {busy === "analyzing" && (
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-1/3 animate-[scan_1.6s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-primary/25 to-primary/50 motion-reduce:hidden"
                aria-hidden
              />
            )}
          </div>
        ) : (
          <Dropzone onFile={draft.choosePhoto} />
        )}
        {preview && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={working}
              onClick={() => replace.current?.click()}
            >
              <RefreshCw aria-hidden /> Ganti foto
            </Button>
            <input
              ref={replace}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void draft.choosePhoto(file);
                e.target.value = "";
              }}
            />
          </>
        )}
        <FormError>{draft.photoError}</FormError>
      </div>
      <div className="space-y-5">
        <div aria-live="polite" className="space-y-4">
          {!preview && (
            <div className="space-y-2 rounded-xl border bg-card p-5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2 font-semibold text-foreground">
                <ScanLine className="size-4 text-primary" aria-hidden />
                Kategori disarankan otomatis
              </p>
              <p>
                Setelah foto diunggah, model klasifikasi menyarankan kategori
                Organik, Plastik, atau Kertas. Kamu tetap bisa mengubahnya.
              </p>
            </div>
          )}
          {working && (
            <p className="flex items-center gap-2 rounded-xl border bg-card p-5 text-sm font-medium">
              <Loader2
                className="size-4 animate-spin text-primary"
                aria-hidden
              />
              {busy === "uploading"
                ? "Mengunggah dan merapikan foto…"
                : "Menganalisis foto…"}
            </p>
          )}
          {prediction && !working && (
            <div className="space-y-4 rounded-xl border bg-card p-5">
              <p className="flex items-center gap-2 font-semibold">
                <Sparkles className="size-4 text-primary" aria-hidden />
                Saran AI: {categoryLabels[prediction.category]} (
                {scoreFormat.format(prediction.confidence)})
              </p>
              <ConfidenceBars
                scores={prediction.scores}
                highlight={prediction.category}
              />
              {prediction.confidence < LOW_CONFIDENCE && (
                <p className="flex gap-2 text-sm text-status-pending">
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden
                  />
                  Model kurang yakin. Pastikan kategori di bawah sudah sesuai.
                </p>
              )}
            </div>
          )}
          {analysisError && !working && (
            <div
              role="alert"
              className="space-y-3 rounded-xl border border-status-pending/30 bg-status-pending-bg p-5 text-sm"
            >
              <p className="font-semibold text-status-pending">
                {analysisError}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    draft.upload && void draft.analyze(draft.upload)
                  }
                >
                  <RefreshCw aria-hidden /> Coba analisis lagi
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={draft.chooseManual}
                >
                  Pilih kategori manual
                </Button>
              </div>
            </div>
          )}
        </div>
        {(prediction || manual) && !working && (
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">
              Kategori laporan
            </legend>
            <RadioGroup
              value={category ?? ""}
              onValueChange={(value) => draft.setCategory(value as Category)}
              className="grid grid-cols-3 gap-2"
            >
              {categories.map((c) => {
                const { icon: Icon, text } = categoryStyle[c];
                return (
                  <Label
                    key={c}
                    htmlFor={`category-${c}`}
                    className="relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border bg-card px-2 py-3 text-sm font-medium transition-colors hover:bg-muted has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft/50 has-[[data-state=checked]]:ring-1 has-[[data-state=checked]]:ring-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                  >
                    <RadioGroupItem
                      id={`category-${c}`}
                      value={c}
                      className="sr-only"
                    />
                    <Icon className={cn("size-5", text)} aria-hidden />
                    {categoryLabels[c]}
                    {prediction?.category === c && (
                      <span className="text-[11px] font-semibold text-primary">
                        Saran AI
                      </span>
                    )}
                  </Label>
                );
              })}
            </RadioGroup>
          </fieldset>
        )}
      </div>
    </div>
  );
}
