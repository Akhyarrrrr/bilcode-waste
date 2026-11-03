import { categories, categoryLabels } from "@bilcode/contracts";
import metrics from "../../../../../ml/artifacts/evaluation/metrics.json";
import { numberFormat, percentFormat } from "@/lib/format";
import { cn } from "@/lib/utils";

// Imported from the frozen evaluation so the page can never drift from the reported results.
const matrix = metrics.confusionMatrix as number[][];
const max = Math.max(...matrix.flat());

export function ModelSection() {
  const facts = [
    {
      value: percentFormat.format(metrics.accuracy),
      label: `akurasi pada ${metrics.testCount} foto uji yang tidak pernah dilihat saat pelatihan`,
    },
    {
      value: metrics.macroF1.toFixed(3).replace(".", ","),
      label: "macro F1, rata-rata seimbang dari ketiga kategori",
    },
    {
      value: numberFormat.format(2268),
      label: "foto dataset RealWaste setelah validasi dan pembersihan duplikat",
    },
  ];
  return (
    <section
      id="model"
      aria-labelledby="model-title"
      className="border-y bg-card py-20"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-8">
          <div className="space-y-3">
            <h2 id="model-title" className="text-3xl font-bold sm:text-4xl">
              Model yang hasilnya bisa diperiksa
            </h2>
            <p className="max-w-prose text-muted-foreground">
              MobileNetV3 dilatih dengan PyTorch, dipilih berdasarkan data
              validasi, lalu diuji satu kali pada data uji terpisah. Model
              dijalankan sebagai ONNX di layanan FastAPI.
            </p>
          </div>
          <dl className="grid gap-6 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label} className="space-y-1">
                <dt className="sr-only">{fact.label}</dt>
                <dd className="tabular text-4xl font-bold tracking-tight">
                  {fact.value}
                </dd>
                <dd className="text-sm text-muted-foreground">{fact.label}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted-foreground">
            Diuji pada dataset RealWaste, bukan jaminan untuk semua kondisi
            lapangan. Foto campuran atau benda di luar tiga kategori bisa salah
            ditebak, karena itu pelapor selalu mengonfirmasi kategorinya.
          </p>
        </div>
        <figure className="space-y-3">
          <figcaption className="text-sm font-semibold">
            Confusion matrix data uji ({metrics.testCount} foto)
          </figcaption>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[26rem] text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th
                    scope="col"
                    className="p-3 text-left font-medium text-muted-foreground"
                  >
                    Label asli ↓ / Prediksi →
                  </th>
                  {categories.map((c) => (
                    <th
                      key={c}
                      scope="col"
                      className="p-3 text-center font-semibold"
                    >
                      {categoryLabels[c]}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="p-3 text-center font-medium text-muted-foreground"
                  >
                    Recall
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((actual, row) => (
                  <tr key={actual} className="border-t">
                    <th scope="row" className="p-3 text-left font-semibold">
                      {categoryLabels[actual]}
                    </th>
                    {categories.map((predicted, col) => {
                      const value = matrix[row]![col]!;
                      const diagonal = row === col;
                      return (
                        <td key={predicted} className="p-1.5">
                          <span
                            className={cn(
                              "tabular grid h-12 place-items-center rounded-lg font-semibold",
                              diagonal
                                ? "text-primary-foreground"
                                : value
                                  ? "bg-status-rejected-bg text-status-rejected"
                                  : "text-muted-foreground",
                            )}
                            style={
                              diagonal
                                ? {
                                    background: `color-mix(in oklab, var(--primary) ${40 + (value / max) * 60}%, var(--card))`,
                                  }
                                : undefined
                            }
                          >
                            {value}
                          </span>
                        </td>
                      );
                    })}
                    <td className="tabular p-3 text-center text-muted-foreground">
                      {percentFormat.format(
                        metrics.classificationReport[actual].recall,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Diagonal = tebakan benar. 5 dari 340 foto salah, terbanyak plastik
            yang ditebak organik.
          </p>
        </figure>
      </div>
    </section>
  );
}
