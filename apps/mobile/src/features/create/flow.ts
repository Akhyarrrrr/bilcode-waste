import type { Category, Prediction, Report, Upload } from "@bilcode/contracts";
import {
  changeImage,
  detailsProblem,
  newDraft,
  selectManualCategory,
  type Draft,
} from "../../state";

export const STEPS = ["Foto", "Detail", "Tinjau"];
export type PhotoPhase =
  "idle" | "preparing" | "uploading" | "analyzing" | "done" | "failed";
type Location = NonNullable<Draft["location"]>;
export type TextField = "title" | "description" | "locationLabel";

export interface FlowState {
  step: number;
  draft: Draft;
  photo: { phase: PhotoPhase; error: string | null; denied: boolean };
  location: { busy: boolean; error: string | null; denied: boolean };
  submitting: boolean;
  error: string | null;
  report: Report | null;
}

export type FlowAction =
  | { type: "photoPicked"; uri: string }
  | { type: "photoPhase"; phase: "preparing" | "uploading" | "analyzing" }
  | { type: "photoPrepared"; uri: string }
  | { type: "uploaded"; upload: Upload }
  | { type: "predicted"; prediction: Prediction }
  | { type: "photoFailed"; error: string; denied?: boolean }
  | { type: "manual" }
  | { type: "category"; category: Category }
  | { type: "field"; field: TextField; value: string }
  | { type: "locating" }
  | { type: "located"; location: Location }
  | { type: "locateFailed"; error: string; denied: boolean }
  | { type: "next" }
  | { type: "goto"; step: number }
  | { type: "submitting" }
  | { type: "submitted"; report: Report }
  | { type: "submitFailed"; error: string };

export const initialFlow = (clientRequestId: string): FlowState => ({
  step: 0,
  draft: newDraft(clientRequestId),
  photo: { phase: "idle", error: null, denied: false },
  location: { busy: false, error: null, denied: false },
  submitting: false,
  error: null,
  report: null,
});

export const photoBusy = (state: FlowState) =>
  ["preparing", "uploading", "analyzing"].includes(state.photo.phase);

export const isDirty = ({ draft }: FlowState) =>
  !!(
    draft.imageUri ||
    draft.location ||
    draft.title.trim() ||
    draft.description.trim() ||
    draft.locationLabel.trim()
  );

export function stepProblem({ step, draft }: FlowState): string | null {
  if (step === 0 && (!draft.upload || !draft.category))
    return draft.upload
      ? "Pilih kategori laporan terlebih dahulu."
      : "Unggah foto sampah terlebih dahulu.";
  if (step === 0 && !draft.prediction && !draft.manual)
    return "Tunggu analisis AI selesai atau pilih kategori manual.";
  if (step === 1) return detailsProblem(draft);
  return null;
}

/** Which Detail field a validation message belongs to, so it shows inline. */
export function problemField(problem: string | null) {
  if (!problem) return null;
  if (/GPS|Koordinat/.test(problem)) return "location" as const;
  if (problem.startsWith("Judul")) return "title" as const;
  if (problem.startsWith("Deskripsi")) return "description" as const;
  if (/penanda/i.test(problem)) return "locationLabel" as const;
  return null;
}

const patch = (state: FlowState, draft: Partial<Draft>): FlowState => ({
  ...state,
  draft: { ...state.draft, ...draft },
  error: null,
});

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "photoPicked":
      return {
        ...state,
        draft: changeImage(state.draft, action.uri),
        photo: { phase: "preparing", error: null, denied: false },
        error: null,
      };
    case "photoPhase":
      return {
        ...state,
        photo: { phase: action.phase, error: null, denied: false },
      };
    case "photoPrepared":
      return patch(state, { imageUri: action.uri });
    case "uploaded":
      return patch(state, { upload: action.upload });
    case "predicted":
      // Pre-select the model's suggestion; the reporter can still change it.
      return {
        ...patch(state, {
          prediction: action.prediction,
          category: action.prediction.category,
          manual: false,
        }),
        photo: { phase: "done", error: null, denied: false },
      };
    case "photoFailed":
      return {
        ...state,
        photo: {
          phase: "failed",
          error: action.error,
          denied: !!action.denied,
        },
      };
    case "manual":
      return {
        ...patch(state, { prediction: null, category: null, manual: true }),
        photo: { phase: "done", error: null, denied: false },
      };
    case "category":
      return state.draft.manual
        ? {
            ...state,
            draft: selectManualCategory(state.draft, action.category),
            error: null,
          }
        : patch(state, { category: action.category });
    case "field":
      return patch(state, { [action.field]: action.value });
    case "locating":
      return { ...state, location: { busy: true, error: null, denied: false } };
    case "located":
      return {
        ...patch(state, { location: action.location }),
        location: { busy: false, error: null, denied: false },
      };
    case "locateFailed":
      return {
        ...state,
        location: { busy: false, error: action.error, denied: action.denied },
      };
    case "next": {
      const problem = stepProblem(state);
      return problem
        ? { ...state, error: problem }
        : {
            ...state,
            step: Math.min(state.step + 1, STEPS.length - 1),
            error: null,
          };
    }
    case "goto":
      return action.step < state.step
        ? { ...state, step: action.step, error: null }
        : state;
    case "submitting":
      return { ...state, submitting: true, error: null };
    case "submitted":
      return { ...state, submitting: false, report: action.report };
    case "submitFailed":
      return { ...state, submitting: false, error: action.error };
  }
}
