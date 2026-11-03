import {
  ApiError,
  type AuthResult,
  type Category,
  type Prediction,
  type ReportInput,
  type Upload,
  type User,
} from "@bilcode/contracts";

export interface Draft {
  clientRequestId: string;
  imageUri: string | null;
  upload: Upload | null;
  prediction: Prediction | null;
  category: Category | null;
  manual: boolean;
  title: string;
  description: string;
  locationLabel: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  } | null;
}
export const newDraft = (id: string): Draft => ({
  clientRequestId: id,
  imageUri: null,
  upload: null,
  prediction: null,
  category: null,
  manual: false,
  title: "",
  description: "",
  locationLabel: "",
  location: null,
});
export const changeImage = (draft: Draft, imageUri: string): Draft => ({
  ...draft,
  imageUri,
  upload: null,
  prediction: null,
  category: null,
  manual: false,
});
export const selectManualCategory = (
  draft: Draft,
  category: Category,
): Draft => ({ ...draft, category, prediction: null, manual: true });
export function permissionProblem(
  granted: boolean,
  subject: "kamera" | "galeri" | "lokasi",
) {
  return granted
    ? null
    : `Izin ${subject} belum diberikan. Coba kembali atau buka pengaturan perangkat.`;
}
export function detailsProblem(draft: Draft): string | null {
  if (!draft.location) return "Ambil koordinat GPS terlebih dahulu.";
  if (
    !Number.isFinite(draft.location.latitude) ||
    Math.abs(draft.location.latitude) > 90 ||
    !Number.isFinite(draft.location.longitude) ||
    Math.abs(draft.location.longitude) > 180
  )
    return "Koordinat lokasi tidak valid. Ambil GPS kembali.";
  if (draft.title.trim().length < 3 || draft.title.trim().length > 120)
    return "Judul harus berisi 3–120 karakter.";
  if (
    draft.description.trim().length < 10 ||
    draft.description.trim().length > 2000
  )
    return "Deskripsi harus berisi 10–2.000 karakter.";
  if (
    draft.locationLabel.trim().length < 2 ||
    draft.locationLabel.trim().length > 200
  )
    return "Tuliskan penanda lokasi, 2–200 karakter.";
  return null;
}
export function reportInput(draft: Draft): ReportInput {
  const problem = detailsProblem(draft);
  if (problem) throw new Error(problem);
  if (!draft.upload || !draft.category)
    throw new Error("Unggah foto dan konfirmasi kategori terlebih dahulu.");
  if (!draft.prediction && !draft.manual)
    throw new Error("Pilih kategori manual atau analisis ulang foto.");
  return {
    clientRequestId: draft.clientRequestId,
    title: draft.title.trim(),
    description: draft.description.trim(),
    category: draft.category,
    uploadId: draft.upload.id,
    predictionId: draft.prediction?.id ?? null,
    latitude: draft.location!.latitude,
    longitude: draft.location!.longitude,
    locationAccuracy: draft.location!.accuracy,
    locationLabel: draft.locationLabel.trim(),
  };
}
export function authToken(result: AuthResult): string {
  if (!result.token)
    throw new Error(
      "Server tidak mengembalikan sesi mobile. Coba masuk kembali.",
    );
  return result.token;
}
export async function restoreSession(
  read: () => Promise<string | null>,
  load: (token: string) => Promise<User>,
): Promise<{ token: string | null; user: User | null; error: string | null }> {
  const token = await read();
  if (!token) return { token: null, user: null, error: null };
  try {
    return { token, user: await load(token), error: null };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401)
      return { token: null, user: null, error: null };
    return {
      token,
      user: null,
      error:
        error instanceof Error ? error.message : "Tidak dapat memulihkan sesi.",
    };
  }
}
