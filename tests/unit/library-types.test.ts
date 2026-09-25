import { describe, expect, it } from "vitest";
import { WATCH_STATUSES, isWatchStatus, type TrackedAnime } from "../../src/lib/library/types";

// Mirrors a row Rust returns: snake_case on both sides (AGENTS.md).
const trackedAnime: TrackedAnime = {
  anilist_id: 21,
  title: "Sousou no Frieren",
  cover_image_path: "covers/21.jpg",
  episode_count: 12,
  season: "FALL",
  year: 2023,
  format: "TV",
  status: "currently-watching",
  episodes_seen: 4,
  saved_at: "2026-09-01 00:00:00",
  updated_at: "2026-09-25 00:00:00",
};

describe("TrackedAnime", () => {
  it("exposes updated_at snake_case alongside saved_at", () => {
    expect(trackedAnime.updated_at).toBe("2026-09-25 00:00:00");
    expect("updatedAt" in trackedAnime).toBe(false);
  });
});

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
