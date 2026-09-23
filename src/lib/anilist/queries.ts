import { AniListError, anilistRequest } from "./client";
import { getMatureContent } from "@/lib/mature-content";
import { getCurrentSeason } from "./season";
import type { AniListMedia, AnimeDetailMedia, MediaRelationType, MediaSeason } from "./types";

const MAX_SEARCH_LENGTH = 200;

const MEDIA_FIELDS = `
        id
        title {
          romaji
          english
        }
        coverImage {
          large
        }
        episodes
        season
        seasonYear
        averageScore
        format
`;

// ADR-0008: `isAdult: false` excludes adult-flagged media. AniList treats an
// explicit `isAdult: null` as an equality filter matching nothing (verified
// against the live API), so the argument is omitted entirely when the
// mature-content toggle is on.
function isAdultArg(): string {
  return getMatureContent() ? "" : "isAdult: false, ";
}

const trendingAnimeDocument = (isAdult: string) => `
  query TrendingAnime {
    Page {
      media(${isAdult}type: ANIME, sort: TRENDING_DESC) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

const seasonalPopularAnimeDocument = (isAdult: string) => `
  query SeasonalPopularAnime($season: MediaSeason, $seasonYear: Int) {
    Page {
      media(
        ${isAdult}type: ANIME
        season: $season
        seasonYear: $seasonYear
        sort: POPULARITY_DESC
      ) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

const topAnimeDocument = (isAdult: string) => `
  query TopAnime($count: Int) {
    Page(perPage: $count) {
      media(${isAdult}type: ANIME, sort: SCORE_DESC) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

const ANIME_DETAIL_DOCUMENT = `
  query AnimeDetail($id: Int) {
    Media(id: $id, type: ANIME) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          large
        }
        episodes
        status
        season
        seasonYear
        startDate {
          year
          month
          day
        }
        averageScore
        format
        source
        genres
        studios {
          nodes {
            name
          }
        }
        description
        relations {
          edges {
            relationType
            node {
              id
              type
              isAdult
              title {
                romaji
                english
              }
              coverImage {
                large
              }
              format
              episodes
            }
          }
        }
    }
  }
`;

// ADR-0004: related entries exist so a user can navigate between a show and
// its sequels/prequels/side stories (including related movies). Source,
// adaptation, and character edges point at non-anime or non-tracker content.
const RELATED_RELATION_TYPES: readonly MediaRelationType[] = [
  "PREQUEL",
  "SEQUEL",
  "PARENT",
  "SIDE_STORY",
  "SUMMARY",
  "ALTERNATIVE",
  "SPIN_OFF",
  "COMPILATION",
  "CONTAINS",
];

function extractMedia(data: unknown): AniListMedia[] {
  if (typeof data !== "object" || data === null) {
    throw new AniListError("AniList returned an unexpected response shape.");
  }
  const page = (data as Record<string, unknown>).Page;
  if (typeof page !== "object" || page === null) {
    throw new AniListError("AniList returned an unexpected response shape.");
  }
  const media = (page as Record<string, unknown>).media;
  if (!Array.isArray(media)) {
    throw new AniListError("AniList returned an unexpected response shape.");
  }
  return media as AniListMedia[];
}

function extractSearchPage(data: unknown): SearchAnimeResult {
  if (typeof data !== "object" || data === null) {
    throw new AniListError("AniList returned an unexpected response shape.");
  }
  const page = (data as Record<string, unknown>).Page;
  if (typeof page !== "object" || page === null) {
    throw new AniListError("AniList returned an unexpected response shape.");
  }
  const record = page as Record<string, unknown>;
  const media = record.media;
  const pageInfo = record.pageInfo;
  if (
    !Array.isArray(media) ||
    typeof pageInfo !== "object" ||
    pageInfo === null ||
    typeof (pageInfo as Record<string, unknown>).hasNextPage !== "boolean"
  ) {
    throw new AniListError("AniList returned an unexpected response shape.");
  }
  return {
    media: media as AniListMedia[],
    hasNextPage: (pageInfo as Record<string, unknown>).hasNextPage as boolean,
  };
}

export interface SearchAnimeFilters {
  search: string;
  genre?: string;
  season?: MediaSeason;
  seasonYear?: number;
}

export interface SearchAnimeResult {
  media: AniListMedia[];
  hasNextPage: boolean;
}

const SEARCH_PER_PAGE = 50;

// GraphQL rejects declared-but-unused variables, so the search document is
// assembled from only the filters that apply. Filter-only queries (no text)
// sort by popularity; text queries keep AniList's search-relevance order.
export async function searchAnime(
  filters: SearchAnimeFilters,
  page: number,
): Promise<SearchAnimeResult> {
  const trimmed = filters.search.trim().slice(0, MAX_SEARCH_LENGTH);
  const hasText = trimmed.length > 0;
  const hasFilters =
    filters.genre !== undefined || filters.season !== undefined || filters.seasonYear !== undefined;
  if (!hasText && !hasFilters) {
    throw new AniListError("Search query must not be empty.");
  }

  const declarations = ["$page: Int", "$perPage: Int"];
  const args = ["type: ANIME"];
  const variables: Record<string, unknown> = {
    page,
    perPage: SEARCH_PER_PAGE,
  };

  // ADR-0008: `isAdult: false` excludes adult-flagged media. AniList treats
  // an explicit `isAdult: null` as an equality filter matching nothing
  // (verified against the live API), so the argument is omitted entirely
  // when the mature-content toggle is on.
  if (!getMatureContent()) {
    args.push("isAdult: false");
  }

  if (hasText) {
    declarations.push("$search: String");
    args.push("search: $search");
    variables.search = trimmed;
  } else {
    args.push("sort: POPULARITY_DESC");
  }
  if (filters.genre !== undefined) {
    declarations.push("$genre: String");
    args.push("genre: $genre");
    variables.genre = filters.genre;
  }
  if (filters.season !== undefined) {
    declarations.push("$season: MediaSeason");
    args.push("season: $season");
    variables.season = filters.season;
  }
  if (filters.seasonYear !== undefined) {
    declarations.push("$seasonYear: Int");
    args.push("seasonYear: $seasonYear");
    variables.seasonYear = filters.seasonYear;
  }

  const document = `
    query SearchAnime(${declarations.join(", ")}) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          hasNextPage
        }
        media(${args.join(", ")}) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const data = await anilistRequest<unknown>(document, variables);
  return extractSearchPage(data);
}

const GENRE_COLLECTION_DOCUMENT = `
  query GenreCollection {
    GenreCollection
  }
`;

export async function genreCollection(): Promise<string[]> {
  const data = await anilistRequest<unknown>(GENRE_COLLECTION_DOCUMENT);
  if (typeof data !== "object" || data === null) {
    throw new AniListError("AniList returned an unexpected response shape.");
  }
  const genres = (data as Record<string, unknown>).GenreCollection;
  if (!Array.isArray(genres) || genres.some((genre) => typeof genre !== "string")) {
    throw new AniListError("AniList returned an unexpected response shape.");
  }
  const list = genres as string[];
  return getMatureContent() ? list : list.filter((g) => g !== "Hentai");
}

export async function trendingAnime(): Promise<AniListMedia[]> {
  const data = await anilistRequest<unknown>(trendingAnimeDocument(isAdultArg()));
  return extractMedia(data);
}

export async function seasonalPopularAnime(): Promise<AniListMedia[]> {
  const { season, seasonYear } = getCurrentSeason();
  const data = await anilistRequest<unknown>(seasonalPopularAnimeDocument(isAdultArg()), {
    season,
    seasonYear,
  });
  return extractMedia(data);
}

export async function topAnime(count: number): Promise<AniListMedia[]> {
  const data = await anilistRequest<unknown>(topAnimeDocument(isAdultArg()), {
    count,
  });
  return extractMedia(data);
}

export async function animeById(id: number): Promise<AnimeDetailMedia> {
  const data = await anilistRequest<unknown>(ANIME_DETAIL_DOCUMENT, { id });
  if (typeof data !== "object" || data === null) {
    throw new AniListError("AniList returned an unexpected response shape.");
  }
  const media = (data as Record<string, unknown>).Media;
  if (typeof media !== "object" || media === null) {
    throw new AniListError("AniList returned an unexpected response shape.");
  }
  return media as AnimeDetailMedia;
}

export function relatedAnime(detail: AnimeDetailMedia): AniListMedia[] {
  const edges = detail.relations?.edges ?? [];
  const allowAdult = getMatureContent();
  return edges
    .filter(
      (edge) =>
        RELATED_RELATION_TYPES.includes(edge.relationType) &&
        edge.node.type === "ANIME" &&
        (allowAdult || edge.node.isAdult !== true),
    )
    .map(({ node }) => ({
      id: node.id,
      title: node.title,
      coverImage: node.coverImage,
      episodes: node.episodes,
      season: null,
      seasonYear: null,
      averageScore: null,
      format: node.format,
    }));
}
