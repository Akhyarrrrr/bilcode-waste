import { describe, expect, it } from "vitest";
import type { Prediction, Report } from "@bilcode/contracts";
import { reportInput } from "../../state";
import {
  flowReducer,
  initialFlow,
  isDirty,
  photoBusy,
  problemField,
  type FlowAction,
  type FlowState,
} from "./flow";

const prediction: Prediction = {
  id: "prediction-1",
  uploadId: "upload-1",
  category: "PLASTIC",
  confidence: 0.998,
  scores: { ORGANIC: 0.001, PLASTIC: 0.998, PAPER: 0.001 },
  modelVersion: "test",
  durationMs: 12,
};
const upload = { id: "upload-1", url: "https://example.com/p.jpg" };
const run = (state: FlowState, ...actions: FlowAction[]) =>
  actions.reduce(flowReducer, state);
const analysed = () =>
  run(
    initialFlow("stable-uuid"),
    { type: "photoPicked", uri: "file:///raw.jpg" },
    { type: "photoPrepared", uri: "file:///small.jpg" },
    { type: "uploaded", upload },
    { type: "photoPhase", phase: "analyzing" },
    { type: "predicted", prediction },
  );
const details: FlowAction[] = [
  { type: "field", field: "title", value: "Sampah plastik di taman" },
  {
    type: "field",
    field: "description",
    value: "Tumpukan botol plastik dekat gerbang.",
  },
  { type: "field", field: "locationLabel", value: "Gerbang utara" },
  {
    type: "located",
    location: { latitude: 5.55, longitude: 95.32, accuracy: 8 },
  },
];

describe("create report flow", () => {
  it("pre-selects the AI suggestion and keeps it editable", () => {
    const state = analysed();
    expect(state.draft.category).toBe("PLASTIC");
    expect(state.photo.phase).toBe("done");
    expect(photoBusy(state)).toBe(false);
    const corrected = flowReducer(state, {
      type: "category",
      category: "PAPER",
    });
    expect(corrected.draft).toMatchObject({
      category: "PAPER",
      prediction,
      manual: false,
    });
    expect(reportInput(run(corrected, ...details).draft).predictionId).toBe(
      "prediction-1",
    );
  });

  it("falls back to a manual category after an AI failure", () => {
    const failed = run(
      initialFlow("id"),
      { type: "photoPicked", uri: "file:///raw.jpg" },
      { type: "uploaded", upload },
      { type: "photoFailed", error: "Layanan AI tidak tersedia." },
    );
    expect(failed.photo).toMatchObject({
      phase: "failed",
      error: "Layanan AI tidak tersedia.",
    });
    expect(flowReducer(failed, { type: "next" }).error).toContain("kategori");
    const manual = run(
      failed,
      { type: "manual" },
      { type: "category", category: "ORGANIC" },
    );
    expect(manual.draft).toMatchObject({
      manual: true,
      category: "ORGANIC",
      prediction: null,
    });
    expect(reportInput(run(manual, ...details).draft)).toMatchObject({
      category: "ORGANIC",
      predictionId: null,
    });
  });

  it("gates each step and maps detail problems to their field", () => {
    const empty = flowReducer(initialFlow("id"), { type: "next" });
    expect(empty.step).toBe(0);
    expect(empty.error).toContain("foto");

    const onDetails = flowReducer(analysed(), { type: "next" });
    expect(onDetails.step).toBe(1);
    const blocked = flowReducer(onDetails, { type: "next" });
    expect(blocked.step).toBe(1);
    expect(problemField(blocked.error)).toBe("location");
    const noTitle = run(onDetails, details[3], { type: "next" });
    expect(problemField(noTitle.error)).toBe("title");

    const review = run(onDetails, ...details, { type: "next" });
    expect(review.step).toBe(2);
    expect(flowReducer(review, { type: "goto", step: 0 }).step).toBe(0);
    expect(flowReducer(onDetails, { type: "goto", step: 2 }).step).toBe(1);
  });

  it("replacing the photo clears AI and category but keeps text and the idempotency key", () => {
    const state = run(analysed(), ...details, {
      type: "photoPicked",
      uri: "file:///second.jpg",
    });
    expect(state.draft).toMatchObject({
      clientRequestId: "stable-uuid",
      imageUri: "file:///second.jpg",
      upload: null,
      prediction: null,
      category: null,
      title: "Sampah plastik di taman",
    });
    expect(photoBusy(state)).toBe(true);
    expect(isDirty(state)).toBe(true);
    expect(isDirty(initialFlow("id"))).toBe(false);
  });

  it("tracks submission and location failures without losing the draft", () => {
    const denied = flowReducer(analysed(), {
      type: "locateFailed",
      error: "Izin lokasi belum diberikan.",
      denied: true,
    });
    expect(denied.location).toEqual({
      busy: false,
      error: "Izin lokasi belum diberikan.",
      denied: true,
    });
    const failed = run(
      denied,
      { type: "submitting" },
      { type: "submitFailed", error: "Jaringan putus" },
    );
    expect(failed).toMatchObject({
      submitting: false,
      error: "Jaringan putus",
      report: null,
    });
    const done = flowReducer(failed, {
      type: "submitted",
      report: { id: "r1" } as Report,
    });
    expect(done.report?.id).toBe("r1");
  });
});
