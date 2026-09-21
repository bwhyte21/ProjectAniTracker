import { AniListError, anilistRequest } from "./client";
import { getMatureContent } from "@/lib/mature-content";
import { getCurrentSeason } from "./season";
import type {
  AniListMedia,
  AnimeDetailMedia,
  MediaRelationType,
} from "./types";

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

const searchAnimeDocument = (isAdult: string) => `
  query SearchAnime($search: String) {
    Page {
      media(${isAdult}type: ANIME, search: $search) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

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

export async function searchAnime(search: string): Promise<AniListMedia[]> {
  const trimmed = search.trim().slice(0, MAX_SEARCH_LENGTH);
  if (trimmed.length === 0) {
    throw new AniListError("Search query must not be empty.");
  }
  const data = await anilistRequest<unknown>(
    searchAnimeDocument(isAdultArg()),
    { search: trimmed },
  );
  return extractMedia(data);
}

export async function trendingAnime(): Promise<AniListMedia[]> {
  const data = await anilistRequest<unknown>(
    trendingAnimeDocument(isAdultArg()),
  );
  return extractMedia(data);
}

export async function seasonalPopularAnime(): Promise<AniListMedia[]> {
  const { season, seasonYear } = getCurrentSeason();
  const data = await anilistRequest<unknown>(
    seasonalPopularAnimeDocument(isAdultArg()),
    { season, seasonYear },
  );
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
      episodes: null,
      season: null,
      seasonYear: null,
      averageScore: null,
      format: node.format,
    }));
}
