import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Lock, Send } from "lucide-react";
import { reportCode, type Report } from "@bilcode/contracts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { EmptyState, ErrorState, FormError } from "@/components/states";
import { useAuth } from "@/app/auth";
import { api, queryKeys } from "@/lib/api";
import { useDocumentTitle } from "@/lib/use-document-title";
import { cn } from "@/lib/utils";
import { DetailsStep } from "./details-step";
import { PhotoStep } from "./photo-step";
import { ReviewStep } from "./review-step";
import { useReportDraft, type DetailErrors } from "./use-report-draft";

const steps = ["Foto dan kategori", "Detail dan lokasi", "Tinjau dan kirim"];

function Stepper({ current }: { current: number }) {
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Langkah laporan">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className="space-y-2"
          >
            <span
              className={cn(
                "block h-1 rounded-full bg-muted",
                (done || active) && "bg-primary",
              )}
            />
            <span
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium text-muted-foreground sm:text-sm",
                active && "text-foreground",
              )}
            >
              {done && <Check className="size-3.5 text-primary" aria-hidden />}
              <span className="sr-only">
                Langkah {index + 1} dari {steps.length}:{" "}
              </span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Wizard({ initial }: { initial?: Report }) {
  const navigate = useNavigate();
  const draft = useReportDraft(initial);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<DetailErrors>({});
  const [stepError, setStepError] = useState("");
  const next = async () => {
    setStepError("");
    if (step === 0) {
      if (!draft.photoReady)
        return setStepError(
          "Unggah foto lalu pastikan kategorinya sebelum lanjut.",
        );
      return setStep(1);
    }
    if (step === 1) {
      const found = draft.validateDetails();
      setErrors(found);
      if (Object.keys(found).length) return;
      return setStep(2);
    }
    const report = await draft.save();
    if (report) {
      toast.success(
        initial
          ? "Perubahan laporan tersimpan."
          : `${reportCode(report.number)} terkirim. Pantau statusnya di halaman ini.`,
      );
      navigate(`/reports/${report.id}`, { replace: true });
    }
  };
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void next();
      }}
      className="space-y-6"
    >
      <Stepper current={step} />
      <h2 className="sr-only">{steps[step]}</h2>
      {step === 0 && <PhotoStep draft={draft} />}
      {step === 1 && <DetailsStep draft={draft} errors={errors} />}
      {step === 2 && <ReviewStep draft={draft} />}
      <FormError>{stepError || draft.saveError}</FormError>
      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t bg-background/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        {step > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setStepError("");
              setStep(step - 1);
            }}
          >
            <ArrowLeft aria-hidden /> Kembali
          </Button>
        ) : (
          <Button asChild variant="ghost">
            <Link to={initial ? `/reports/${initial.id}` : "/reports"}>
              Batal
            </Link>
          </Button>
        )}
        <Button
          type="submit"
          disabled={draft.busy !== null && draft.busy !== "locating"}
        >
          {step < 2 ? (
            <>
              Lanjut <ArrowRight aria-hidden />
            </>
          ) : draft.busy === "saving" ? (
            "Mengirim…"
          ) : (
            <>
              <Send aria-hidden />
              {initial ? "Simpan perubahan" : "Kirim laporan"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function ReportFormPage() {
  const { id } = useParams();
  const { user } = useAuth();
  useDocumentTitle(id ? "Ubah laporan" : "Buat laporan");
  const existing = useQuery({
    queryKey: queryKeys.report(id ?? ""),
    queryFn: () => api.request<Report>(`/reports/${id}`),
    enabled: !!id,
  });
  const header = (
    <PageHeader
      title={id ? "Ubah laporan" : "Buat laporan"}
      description="Foto dan titik lokasi membantu petugas menemukan sampahnya dengan cepat."
    />
  );
  if (id && existing.isPending)
    return (
      <div className="space-y-6">
        {header}
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  if (id && existing.error)
    return (
      <ErrorState error={existing.error} onRetry={() => existing.refetch()} />
    );
  if (
    existing.data &&
    user?.role !== "ADMIN" &&
    existing.data.status !== "PENDING"
  )
    return (
      <EmptyState
        icon={Lock}
        title="Laporan sedang ditangani"
        description="Laporan yang sudah diproses tidak dapat diubah lagi oleh pelapor."
        action={
          <Button asChild variant="outline">
            <Link to={`/reports/${existing.data.id}`}>Lihat laporan</Link>
          </Button>
        }
      />
    );
  return (
    <div className="space-y-6">
      {header}
      <Wizard key={id ?? "new"} initial={existing.data} />
    </div>
  );
}
