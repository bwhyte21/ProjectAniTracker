export type MediaSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";

export type MediaFormat =
  "TV" | "TV_SHORT" | "MOVIE" | "SPECIAL" | "OVA" | "ONA" | "MUSIC";

export type MediaStatus =
  "FINISHED" | "RELEASING" | "NOT_YET_RELEASED" | "CANCELLED" | "HIATUS";

export type MediaSource =
  | "ORIGINAL"
  | "MANGA"
  | "LIGHT_NOVEL"
  | "VISUAL_NOVEL"
  | "VIDEO_GAME"
  | "OTHER"
  | "NOVEL"
  | "DOUJINSHI"
  | "ANIME"
  | "WEB_NOVEL"
  | "LIVE_ACTION"
  | "GAME"
  | "COMIC"
  | "MULTIMEDIA_PROJECT"
  | "PICTURE_BOOK";

export type MediaRelationType =
  | "SOURCE"
  | "ADAPTATION"
  | "PREQUEL"
  | "SEQUEL"
  | "PARENT"
  | "SIDE_STORY"
  | "CHARACTER"
  | "SUMMARY"
  | "ALTERNATIVE"
  | "SPIN_OFF"
  | "OTHER"
  | "COMPILATION"
  | "CONTAINS";

export type MediaType = "ANIME" | "MANGA";

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

export interface AnimeDetailTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
}

export interface RelatedMedia {
  id: number;
  type: MediaType | null;
  isAdult: boolean | null;
  title: MediaTitle;
  coverImage: MediaCoverImage | null;
  format: MediaFormat | null;
}

export interface RelatedMediaEdge {
  relationType: MediaRelationType;
  node: RelatedMedia;
}

export interface AnimeDetailMedia {
  id: number;
  title: AnimeDetailTitle;
  coverImage: MediaCoverImage | null;
  episodes: number | null;
  status: MediaStatus | null;
  season: MediaSeason | null;
  seasonYear: number | null;
  averageScore: number | null;
  format: MediaFormat | null;
  source: MediaSource | null;
  genres: string[] | null;
  studios: { nodes: { name: string }[] } | null;
  description: string | null;
  relations: { edges: RelatedMediaEdge[] | null } | null;
}
