import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { Category, Prediction, Report, Upload } from "@bilcode/contracts";
import { api, errorMessage, queryKeys } from "@/lib/api";
import { compressPhoto } from "@/lib/format";

export const detailsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Judul minimal 3 karakter.")
    .max(120, "Judul maksimal 120 karakter."),
  description: z
    .string()
    .trim()
    .min(10, "Ceritakan kondisi sampah dalam minimal 10 karakter.")
    .max(2000, "Deskripsi maksimal 2.000 karakter."),
  locationLabel: z
    .string()
    .trim()
    .min(2, "Isi nama tempat atau patokan yang mudah ditemukan.")
    .max(200, "Nama lokasi maksimal 200 karakter."),
});
export type Details = z.infer<typeof detailsSchema>;
export type DetailErrors = Partial<Record<keyof Details | "position", string>>;

/** All state of the create/edit wizard; components only render it. */
export function useReportDraft(initial?: Report) {
  const client = useQueryClient();
  const [upload, setUpload] = useState<Upload | null>(initial?.photo ?? null);
  const [preview, setPreview] = useState(initial?.photo.url ?? "");
  const [prediction, setPrediction] = useState<Prediction | null>(
    initial?.prediction ?? null,
  );
  const [manual, setManual] = useState(!!initial && !initial.prediction);
  const [category, setCategory] = useState<Category | null>(
    initial?.category ?? null,
  );
  const [details, setDetails] = useState<Details>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    locationLabel: initial?.locationLabel ?? "",
  });
  const [position, setPosition] = useState<[number, number] | null>(
    initial ? [initial.latitude, initial.longitude] : null,
  );
  const [accuracy, setAccuracy] = useState<number | null>(
    initial?.locationAccuracy ?? null,
  );
  const [busy, setBusy] = useState<
    "uploading" | "analyzing" | "locating" | "saving" | null
  >(null);
  const [photoError, setPhotoError] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [saveError, setSaveError] = useState("");
  // Stable across retries so a resent submit never creates a duplicate report.
  const requestId = useRef(crypto.randomUUID());
  // The version the form was filled from; a background refetch must not bump it before saving.
  const baseVersion = useRef(initial?.version);
  const analysis = useRef<AbortController | null>(null);

  useEffect(() => () => analysis.current?.abort(), []);
  useEffect(
    () => () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const analyze = async (photo: Upload) => {
    analysis.current?.abort();
    const controller = new AbortController();
    analysis.current = controller;
    setBusy("analyzing");
    setAnalysisError("");
    setManual(false);
    try {
      const result = await api.request<Prediction>("/predictions", {
        method: "POST",
        body: JSON.stringify({ uploadId: photo.id }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setPrediction(result);
      setCategory(result.category);
    } catch (e) {
      if (!controller.signal.aborted)
        setAnalysisError(errorMessage(e, "Analisis foto belum tersedia."));
    } finally {
      if (!controller.signal.aborted) setBusy(null);
    }
  };

  const choosePhoto = async (file: File) => {
    analysis.current?.abort();
    setBusy("uploading");
    setPhotoError("");
    setAnalysisError("");
    setUpload(null);
    setPrediction(null);
    setCategory(null);
    setManual(false);
    try {
      const normalized = await compressPhoto(file);
      setPreview(URL.createObjectURL(normalized));
      const body = new FormData();
      body.append("file", normalized);
      const photo = await api.request<Upload>("/uploads", {
        method: "POST",
        body,
      });
      setUpload(photo);
      await analyze(photo);
    } catch (e) {
      setPhotoError(errorMessage(e, "Foto belum berhasil diunggah."));
      setBusy(null);
    }
  };

  const chooseManual = () => {
    analysis.current?.abort();
    setBusy(null);
    setManual(true);
    setPrediction(null);
    setAnalysisError("");
  };

  const locate = () => {
    setLocationError("");
    if (!navigator.geolocation)
      return setLocationError(
        "Browser ini tidak mendukung GPS. Klik peta untuk memilih titik.",
      );
    setBusy("locating");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosition([p.coords.latitude, p.coords.longitude]);
        setAccuracy(p.coords.accuracy);
        setBusy(null);
      },
      () => {
        setLocationError(
          "Lokasi belum dapat diakses. Izinkan akses lokasi di browser, atau klik peta untuk memilih titik.",
        );
        setBusy(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  const pickOnMap = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    setAccuracy(null);
    setLocationError("");
  };

  const photoReady = !!upload && !!category && (!!prediction || manual);

  const validateDetails = (): DetailErrors => {
    const result = detailsSchema.safeParse(details);
    const errors: DetailErrors = {};
    if (!result.success)
      for (const issue of result.error.issues)
        errors[issue.path[0] as keyof Details] ??= issue.message;
    if (!position)
      errors.position = "Gunakan lokasi saat ini atau klik titik pada peta.";
    return errors;
  };

  const save = async (): Promise<Report | null> => {
    if (!upload || !position || !category) return null;
    setBusy("saving");
    setSaveError("");
    const parsed = detailsSchema.parse(details);
    const body = {
      ...parsed,
      category,
      latitude: position[0],
      longitude: position[1],
      locationAccuracy: accuracy,
      uploadId: upload.id,
      predictionId: prediction?.id ?? null,
      ...(initial
        ? { version: baseVersion.current }
        : { clientRequestId: requestId.current }),
    };
    try {
      const report = await api.request<Report>(
        initial ? `/reports/${initial.id}` : "/reports",
        { method: initial ? "PUT" : "POST", body: JSON.stringify(body) },
      );
      client.setQueryData(queryKeys.report(report.id), report);
      void client.invalidateQueries({ queryKey: ["reports"] });
      void client.invalidateQueries({ queryKey: queryKeys.dashboard });
      return report;
    } catch (e) {
      setSaveError(
        errorMessage(
          e,
          "Laporan belum terkirim. Isianmu tetap tersimpan di halaman ini.",
        ),
      );
      return null;
    } finally {
      setBusy(null);
    }
  };

  return {
    editing: !!initial,
    upload,
    preview,
    prediction,
    manual,
    category,
    setCategory,
    details,
    setDetails,
    position,
    accuracy,
    busy,
    photoError,
    analysisError,
    locationError,
    saveError,
    photoReady,
    choosePhoto,
    analyze,
    chooseManual,
    locate,
    pickOnMap,
    validateDetails,
    save,
  };
}
export type ReportDraft = ReturnType<typeof useReportDraft>;
