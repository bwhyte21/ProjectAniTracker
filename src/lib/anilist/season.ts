import type { MediaSeason } from "./types";

export interface CurrentSeason {
  season: MediaSeason;
  seasonYear: number;
}

export function getCurrentSeason(now: Date = new Date()): CurrentSeason {
  const month = now.getMonth() + 1;
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
