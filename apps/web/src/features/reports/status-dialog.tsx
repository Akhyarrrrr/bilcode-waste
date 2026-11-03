import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRightLeft } from "lucide-react";
import {
  reportLabels,
  transitions,
  type Report,
  type Status,
} from "@bilcode/contracts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, statusStyle } from "@/components/report-badges";
import { FormError } from "@/components/states";
import { api, errorMessage, queryKeys } from "@/lib/api";
import { cn } from "@/lib/utils";

const hints: Partial<Record<Status, string>> = {
  IN_PROGRESS: "Laporan valid dan mulai ditangani petugas.",
  COMPLETED: "Sampah sudah diangkut atau area sudah bersih.",
  REJECTED: "Laporan tidak dapat ditindaklanjuti. Alasan wajib diisi.",
};

/** Admin-only status change; only transitions allowed by the shared contract are offered. */
export function StatusDialog({ report }: { report: Report }) {
  const client = useQueryClient();
  const options = transitions[report.status];
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState<Status | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      api.request<Report>(`/reports/${report.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: next,
          version: report.version,
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      }),
    onSuccess: (updated) => {
      client.setQueryData(queryKeys.report(updated.id), updated);
      void client.invalidateQueries({ queryKey: ["reports"] });
      void client.invalidateQueries({ queryKey: queryKeys.dashboard });
      toast.success(`Status diubah menjadi ${reportLabels[updated.status]}.`);
      setOpen(false);
    },
    onError: (e) =>
      setError(errorMessage(e, "Status belum berhasil diubah. Coba lagi.")),
  });
  if (options.length === 0) return null;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!next) return setError("Pilih status berikutnya.");
    if (next === "REJECTED" && !note.trim())
      return setError("Tuliskan alasan penolakan untuk pelapor.");
    mutation.mutate();
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) {
          setNext("");
          setNote("");
          setError("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <ArrowRightLeft aria-hidden /> Ubah status
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Ubah status laporan</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              Status saat ini <StatusBadge status={report.status} />
            </DialogDescription>
          </DialogHeader>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              Status berikutnya
            </legend>
            <RadioGroup
              value={next}
              onValueChange={(value) => setNext(value as Status)}
              className="gap-2"
            >
              {options.map((status) => {
                const { icon: Icon, className } = statusStyle[status];
                return (
                  <Label
                    key={status}
                    htmlFor={`status-${status}`}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft/40",
                    )}
                  >
                    <RadioGroupItem
                      id={`status-${status}`}
                      value={status}
                      className="mt-0.5"
                    />
                    <span className="space-y-0.5">
                      <span className="flex items-center gap-2 font-semibold">
                        <span
                          className={cn(
                            "grid size-5 place-items-center rounded-full",
                            className,
                          )}
                        >
                          <Icon className="size-3" aria-hidden />
                        </span>
                        {reportLabels[status]}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {hints[status]}
                      </span>
                    </span>
                  </Label>
                );
              })}
            </RadioGroup>
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="status-note">
              Catatan untuk pelapor
              {next === "REJECTED" ? " (wajib)" : " (opsional)"}
            </Label>
            <Textarea
              id="status-note"
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Petugas dijadwalkan datang besok pagi."
              rows={3}
            />
            <p className="text-right text-xs text-muted-foreground tabular">
              {note.length}/500
            </p>
          </div>
          <FormError>{error}</FormError>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Menyimpan…" : "Simpan status"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
