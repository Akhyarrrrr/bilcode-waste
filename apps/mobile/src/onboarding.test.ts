import { describe, expect, it } from "vitest";
import {
  entryDestination,
  finishOnboarding,
  loadOnboarding,
  onboardingKey,
  onboardingMarker,
} from "./onboarding";

describe("first launch and returning routes", () => {
  it("shows onboarding only for a new signed-out installation", () => {
    expect(entryDestination(false, false)).toBe("onboarding");
    expect(entryDestination(false, true)).toBe("auth");
    expect(entryDestination(true, false)).toBe("(tabs)");
    expect(entryDestination(true, true)).toBe("(tabs)");
  });
  it("persists completion used by both skip and final step, then bypasses on next launch", async () => {
    const storage = new Map<string, string>();
    const read = async (key: string) => storage.get(key) ?? null;
    expect(await loadOnboarding(read)).toBe(false);
    expect(
      await finishOnboarding(async (key, value) => {
        storage.set(key, value);
      }),
    ).toBe(true);
    expect(storage.get(onboardingKey)).toBe(onboardingMarker);
    expect(entryDestination(false, await loadOnboarding(read))).toBe("auth");
  });
  it("does not advance when SecureStore persistence fails", async () => {
    await expect(
      finishOnboarding(async () => {
        throw new Error("storage unavailable");
      }),
    ).rejects.toThrow("storage unavailable");
    expect(
      entryDestination(false, await loadOnboarding(async () => null)),
    ).toBe("onboarding");
  });
  it("treats an unknown marker as incomplete and exposes read failures for retry", async () => {
    expect(await loadOnboarding(async () => "unknown")).toBe(false);
    await expect(
      loadOnboarding(async () => {
        throw new Error("locked");
      }),
    ).rejects.toThrow("locked");
  });
});
