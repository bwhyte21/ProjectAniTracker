import { describe, expect, it } from "vitest";
import { WATCH_STATUSES, isWatchStatus } from "../../src/lib/library/types";

describe("isWatchStatus", () => {
  it("accepts every defined watch status", () => {
    for (const status of WATCH_STATUSES) {
      expect(isWatchStatus(status)).toBe(true);
    }
  });

  it("rejects values outside the status set", () => {
    expect(isWatchStatus("watching")).toBe(false);
    expect(isWatchStatus("")).toBe(false);
    expect(isWatchStatus("completed ")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isWatchStatus("Completed")).toBe(false);
    expect(isWatchStatus("COMPLETED")).toBe(false);
  });
});
