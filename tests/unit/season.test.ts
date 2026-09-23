import { describe, expect, it } from "vitest";
import { deriveSeason, getCurrentSeason } from "../../src/lib/anilist/season";

describe("getCurrentSeason", () => {
  it("maps January through March to Winter of the current year", () => {
    expect(getCurrentSeason(new Date(2026, 0, 15))).toEqual({
      season: "WINTER",
      seasonYear: 2026,
    });
    expect(getCurrentSeason(new Date(2026, 2, 31))).toEqual({
      season: "WINTER",
      seasonYear: 2026,
    });
  });

  it("maps April through June to Spring", () => {
    expect(getCurrentSeason(new Date(2026, 3, 1))).toEqual({
      season: "SPRING",
      seasonYear: 2026,
    });
    expect(getCurrentSeason(new Date(2026, 5, 30))).toEqual({
      season: "SPRING",
      seasonYear: 2026,
    });
  });

  it("maps July through September to Summer", () => {
    expect(getCurrentSeason(new Date(2026, 6, 1))).toEqual({
      season: "SUMMER",
      seasonYear: 2026,
    });
    expect(getCurrentSeason(new Date(2026, 8, 30))).toEqual({
      season: "SUMMER",
      seasonYear: 2026,
    });
  });

  it("maps October and November to Fall", () => {
    expect(getCurrentSeason(new Date(2026, 9, 1))).toEqual({
      season: "FALL",
      seasonYear: 2026,
    });
    expect(getCurrentSeason(new Date(2026, 10, 30))).toEqual({
      season: "FALL",
      seasonYear: 2026,
    });
  });

  it("maps December to next year's Winter (AniList winter block)", () => {
    expect(getCurrentSeason(new Date(2026, 11, 1))).toEqual({
      season: "WINTER",
      seasonYear: 2027,
    });
    expect(getCurrentSeason(new Date(2020, 11, 31))).toEqual({
      season: "WINTER",
      seasonYear: 2021,
    });
  });
});

describe("deriveSeason", () => {
  const now = new Date(2026, 8, 23);

  it("keeps AniList's projection when startDate is missing", () => {
    expect(deriveSeason(null, "WINTER", 2027, now)).toEqual({
      season: "WINTER",
      seasonYear: 2027,
    });
    expect(deriveSeason({ year: null, month: null, day: null }, "SPRING", 2027, now)).toEqual({
      season: "SPRING",
      seasonYear: 2027,
    });
  });

  it("keeps AniList's projection when the show has not aired yet", () => {
    expect(deriveSeason({ year: 2027, month: 4, day: 1 }, "WINTER", 2027, now)).toEqual({
      season: "WINTER",
      seasonYear: 2027,
    });
  });

  it("derives Winter for January through March premieres", () => {
    expect(deriveSeason({ year: 2026, month: 1, day: 5 }, "FALL", 2025, now)).toEqual({
      season: "WINTER",
      seasonYear: 2026,
    });
    expect(deriveSeason({ year: 2026, month: 3, day: 31 }, null, null, now)).toEqual({
      season: "WINTER",
      seasonYear: 2026,
    });
  });

  it("derives Spring for April through June premieres", () => {
    expect(deriveSeason({ year: 2024, month: 4, day: 1 }, "WINTER", 2024, now)).toEqual({
      season: "SPRING",
      seasonYear: 2024,
    });
    expect(deriveSeason({ year: 2024, month: 6, day: 30 }, null, null, now)).toEqual({
      season: "SPRING",
      seasonYear: 2024,
    });
  });

  it("derives Summer for July through September premieres", () => {
    expect(deriveSeason({ year: 2024, month: 7, day: 1 }, "SUMMER", 2024, now)).toEqual({
      season: "SUMMER",
      seasonYear: 2024,
    });
    expect(deriveSeason({ year: 2024, month: 9, day: 30 }, null, null, now)).toEqual({
      season: "SUMMER",
      seasonYear: 2024,
    });
  });

  it("derives Fall for October and November premieres", () => {
    expect(deriveSeason({ year: 2023, month: 10, day: 1 }, "FALL", 2023, now)).toEqual({
      season: "FALL",
      seasonYear: 2023,
    });
    expect(deriveSeason({ year: 2023, month: 11, day: 30 }, null, null, now)).toEqual({
      season: "FALL",
      seasonYear: 2023,
    });
  });

  it("derives next year's Winter for December premieres", () => {
    expect(deriveSeason({ year: 2020, month: 12, day: 1 }, "FALL", 2020, now)).toEqual({
      season: "WINTER",
      seasonYear: 2021,
    });
  });

  it("handles a startDate without a day", () => {
    expect(deriveSeason({ year: 2024, month: 4, day: null }, null, null, now)).toEqual({
      season: "SPRING",
      seasonYear: 2024,
    });
  });
});
