import type { FuzzyDate, MediaSeason } from "./types";

export interface CurrentSeason {
  season: MediaSeason;
  seasonYear: number;
}

export const SEASON_LABELS: Record<MediaSeason, string> = {
  WINTER: "Winter",
  SPRING: "Spring",
  SUMMER: "Summer",
  FALL: "Fall",
};

export function getCurrentSeason(now: Date = new Date()): CurrentSeason {
  const month = now.getMonth() + 1;
  // AniList's live winter block spans December of the prior year, so
  // December already belongs to next year's Winter.
  if (month === 12) {
    return { season: "WINTER", seasonYear: now.getFullYear() + 1 };
  }
  let season: MediaSeason;
  if (month <= 3) {
    season = "WINTER";
  } else if (month <= 6) {
    season = "SPRING";
  } else if (month <= 9) {
    season = "SUMMER";
  } else {
    season = "FALL";
  }
  return { season, seasonYear: now.getFullYear() };
}

export interface DerivedSeason {
  season: MediaSeason | null;
  seasonYear: number | null;
}

// AniList's season/seasonYear can disagree with the actual air date (December
// premieres are filed under the next year's Winter, plus data-entry errors).
// Derive the season from startDate once the show has started airing; unaired
// shows (missing or future startDate) keep AniList's projection.
export function deriveSeason(
  startDate: FuzzyDate | null,
  season: MediaSeason | null,
  seasonYear: number | null,
  now: Date = new Date(),
): DerivedSeason {
  if (startDate?.year == null || startDate.month == null) {
    return { season, seasonYear };
  }
  const start = new Date(startDate.year, startDate.month - 1, startDate.day ?? 1);
  if (start.getTime() > now.getTime()) {
    return { season, seasonYear };
  }
  const month = startDate.month;
  if (month <= 3) {
    return { season: "WINTER", seasonYear: startDate.year };
  }
  if (month <= 6) {
    return { season: "SPRING", seasonYear: startDate.year };
  }
  if (month <= 9) {
    return { season: "SUMMER", seasonYear: startDate.year };
  }
  if (month <= 11) {
    return { season: "FALL", seasonYear: startDate.year };
  }
  return { season: "WINTER", seasonYear: startDate.year + 1 };
}
