import { describe, expect, it } from "vitest";
import { ApiError, type Prediction, type User } from "@bilcode/contracts";
import {
  authToken,
  changeImage,
  detailsProblem,
  newDraft,
  permissionProblem,
  reportInput,
  restoreSession,
  selectManualCategory,
} from "./state";

const prediction: Prediction = {
  id: "prediction-1",
  uploadId: "upload-1",
  category: "PLASTIC",
  confidence: 0.9,
  scores: { ORGANIC: 0.05, PLASTIC: 0.9, PAPER: 0.05 },
  modelVersion: "test",
  durationMs: 10,
};
const user: User = {
  id: "u1",
  name: "Pelapor",
  email: "reporter@example.com",
  isLocked: false,
  role: "USER",
  isActive: true,
  createdAt: "2026-11-01T00:00:00Z",
};
const complete = () => ({
  ...newDraft("stable-uuid"),
  imageUri: "file:///photo.jpg",
  upload: { id: "upload-1", url: "https://example.com/photo" },
  prediction,
  category: "PLASTIC" as const,
  title: "Sampah di taman",
  description: "Tumpukan sampah plastik di dekat gerbang.",
  locationLabel: "Gerbang taman",
  location: { latitude: -6.2, longitude: 106.8, accuracy: 12 },
});

describe("report draft boundaries", () => {
  it("denied location/camera/gallery stays actionable without manufacturing coordinates or media", () => {
    for (const kind of ["lokasi", "kamera", "galeri"] as const)
      expect(permissionProblem(false, kind)).toContain("pengaturan");
    expect(permissionProblem(true, "lokasi")).toBeNull();
    const draft = newDraft("uuid");
    expect(draft.location).toBeNull();
    expect(draft.upload).toBeNull();
    expect(detailsProblem(draft)).toContain("GPS");
  });
  it("image replacement clears prior AI/media/category while preserving text and idempotency key", () => {
    const changed = changeImage(complete(), "file:///replacement.jpg");
    expect(changed).toMatchObject({
      clientRequestId: "stable-uuid",
      imageUri: "file:///replacement.jpg",
      upload: null,
      prediction: null,
      category: null,
      manual: false,
      title: "Sampah di taman",
    });
  });
  it("explicit manual fallback sends null prediction and preserves the selected category", () => {
    const manual = selectManualCategory(complete(), "ORGANIC");
    expect(reportInput(manual)).toMatchObject({
      category: "ORGANIC",
      predictionId: null,
    });
  });
  it("retries use one stable UUID and server-shaped coordinates/accuracy", () => {
    const draft = complete();
    const firstAttempt = reportInput(draft);
    const retryAfterCorrection = reportInput(
      selectManualCategory(
        { ...draft, description: "Tumpukan di sisi timur gerbang taman." },
        "PAPER",
      ),
    );
    expect(retryAfterCorrection.clientRequestId).toBe(
      firstAttempt.clientRequestId,
    );
    expect(retryAfterCorrection).toMatchObject({
      category: "PAPER",
      predictionId: null,
    });
    expect(firstAttempt).toMatchObject({
      clientRequestId: "stable-uuid",
      locationAccuracy: 12,
      latitude: -6.2,
    });
  });
  it("does not accept a missing explicit category confirmation or unavailable inference without manual consent", () => {
    expect(() => reportInput({ ...complete(), category: null })).toThrow(
      "kategori",
    );
    expect(() => reportInput({ ...complete(), prediction: null })).toThrow(
      "manual",
    );
  });
  it("rejects whitespace and invalid coordinates at the form boundary", () => {
    expect(detailsProblem({ ...complete(), title: "   " })).toContain("Judul");
    expect(
      detailsProblem({
        ...complete(),
        location: { latitude: NaN, longitude: 106, accuracy: null },
      }),
    ).toContain("Koordinat");
  });
});
describe("session restore", () => {
  it("restores the stored bearer token with the API user", async () => {
    expect(
      await restoreSession(
        async () => "token",
        async (token) => {
          expect(token).toBe("token");
          return user;
        },
      ),
    ).toEqual({ token: "token", user, error: null });
  });
  it("discards a rejected session", async () => {
    expect(
      await restoreSession(
        async () => "expired",
        async () => {
          throw new ApiError(401, "SESSION_EXPIRED", "Sesi berakhir");
        },
      ),
    ).toEqual({ token: null, user: null, error: null });
  });
  it("preserves the session during network failure so restore can retry", async () => {
    expect(
      await restoreSession(
        async () => "token",
        async () => {
          throw new ApiError(0, "NETWORK", "Jaringan terputus");
        },
      ),
    ).toEqual({ token: "token", user: null, error: "Jaringan terputus" });
  });
  it("rejects auth responses without a mobile token", () => {
    expect(() => authToken({ user })).toThrow("sesi mobile");
  });
});
