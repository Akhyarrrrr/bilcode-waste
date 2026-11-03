import { describe, expect, it } from "vitest";
import { validateCredentials } from "./validate";

describe("auth field validation", () => {
  it("ties each problem to its own field", () => {
    expect(
      validateCredentials({ name: " ", email: "nope", password: "123" }, true),
    ).toEqual({
      name: "Nama minimal 2 karakter.",
      email: "Tuliskan alamat email yang valid.",
      password: "Kata sandi minimal 8 karakter.",
    });
  });
  it("ignores the name when signing in and accepts valid input", () => {
    expect(
      validateCredentials(
        { name: "", email: " user@bilcode-waste.test ", password: "12345678" },
        false,
      ),
    ).toEqual({});
  });
});
