import { AniListError, anilistRequest } from "./client";
import { getCurrentSeason } from "./season";
import type { AniListMedia } from "./types";

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

const SEARCH_ANIME_DOCUMENT = `
  query SearchAnime($search: String) {
    Page {
      media(type: ANIME, search: $search) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

const TRENDING_ANIME_DOCUMENT = `
  query TrendingAnime {
    Page {
      media(type: ANIME, sort: TRENDING_DESC) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

const SEASONAL_POPULAR_ANIME_DOCUMENT = `
  query SeasonalPopularAnime($season: MediaSeason, $seasonYear: Int) {
    Page {
      media(
        type: ANIME
        season: $season
        seasonYear: $seasonYear
        sort: POPULARITY_DESC
      ) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

const TOP_ANIME_DOCUMENT = `
  query TopAnime($count: Int) {
    Page(perPage: $count) {
      media(type: ANIME, sort: SCORE_DESC) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

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
  const data = await anilistRequest<unknown>(SEARCH_ANIME_DOCUMENT, {
    search: trimmed,
  });
  return extractMedia(data);
}

export async function trendingAnime(): Promise<AniListMedia[]> {
  const data = await anilistRequest<unknown>(TRENDING_ANIME_DOCUMENT);
  return extractMedia(data);
}

export async function seasonalPopularAnime(): Promise<AniListMedia[]> {
  const { season, seasonYear } = getCurrentSeason();
  const data = await anilistRequest<unknown>(SEASONAL_POPULAR_ANIME_DOCUMENT, {
    season,
    seasonYear,
  });
  return extractMedia(data);
}

export async function topAnime(count: number): Promise<AniListMedia[]> {
  const data = await anilistRequest<unknown>(TOP_ANIME_DOCUMENT, { count });
  return extractMedia(data);
}
