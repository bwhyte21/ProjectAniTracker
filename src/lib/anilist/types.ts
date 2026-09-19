export type MediaSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";

export type MediaFormat =
  | "TV"
  | "TV_SHORT"
  | "MOVIE"
  | "SPECIAL"
  | "OVA"
  | "ONA"
  | "MUSIC";

export interface MediaTitle {
  romaji: string | null;
  english: string | null;
}

export interface MediaCoverImage {
  large: string | null;
}

export interface AniListMedia {
  id: number;
  title: MediaTitle;
  coverImage: MediaCoverImage | null;
  episodes: number | null;
  season: MediaSeason | null;
  seasonYear: number | null;
  averageScore: number | null;
  format: MediaFormat | null;
}
