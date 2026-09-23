import { describe, expect, it } from "vitest";
import { errorMessage } from "../../src/lib/errors";

describe("errorMessage", () => {
  it("returns the message of an Error instance", () => {
    expect(errorMessage(new Error("failed to save anime"))).toBe("failed to save anime");
  });

  it("returns the string of a plain-string rejection", () => {
    // Rust IPC commands reject with a plain string (Result<T, String>).
    expect(errorMessage("failed to save anime: database is not loaded")).toBe(
      "failed to save anime: database is not loaded",
    );
  });

  it("returns the fallback for other non-Error rejections", () => {
    expect(errorMessage(undefined)).toBe("An unexpected error occurred.");
    expect(errorMessage("")).toBe("An unexpected error occurred.");
  });
});
