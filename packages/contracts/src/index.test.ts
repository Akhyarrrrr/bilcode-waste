import { describe, it, expect } from "vitest";
import {
  canTransition,
  reportLabels,
  categories,
  ApiError,
  createApiClient,
} from "./index";
describe("report contract", () => {
  it("works in native runtimes without AbortSignal.timeout", async () => {
    const original = AbortSignal.timeout;
    Object.defineProperty(AbortSignal, "timeout", {
      value: undefined,
      configurable: true,
    });
    try {
      const client = createApiClient({
        baseUrl: "http://test",
        fetch: async () => new Response(JSON.stringify({ ok: true })),
      });
      expect(await client.request("/health")).toEqual({ ok: true });
    } finally {
      Object.defineProperty(AbortSignal, "timeout", {
        value: original,
        configurable: true,
      });
    }
  });
  it("allows only the agreed lifecycle", () => {
    expect(canTransition("PENDING", "IN_PROGRESS")).toBe(true);
    expect(canTransition("PENDING", "COMPLETED")).toBe(false);
    expect(canTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
    expect(canTransition("COMPLETED", "PENDING")).toBe(false);
    expect(canTransition("REJECTED", "IN_PROGRESS")).toBe(false);
    expect(reportLabels.REJECTED).toBe("Ditolak");
    expect(categories).toHaveLength(3);
  });
  it("preserves a typed error and never retries mutations", async () => {
    let calls = 0;
    const api = createApiClient({
      baseUrl: "http://test",
      fetch: async () => {
        calls++;
        return new Response(
          JSON.stringify({
            error: { code: "CONFLICT", message: "Laporan berubah." },
          }),
          { status: 409 },
        );
      },
    });
    await expect(
      api.request("/reports", { method: "POST", body: "{}" }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(calls).toBe(1);
  });
});
