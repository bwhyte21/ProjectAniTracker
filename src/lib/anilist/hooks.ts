import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { AniListNetworkError } from "./client";
import {
  animeById,
  genreCollection,
  searchAnime,
  seasonalPopularAnime,
  topAnime,
  trendingAnime,
  type SearchAnimeFilters,
} from "./queries";
import { getCurrentSeason } from "./season";

// Auto-retry targets transient connectivity only: at most two retries with
// TanStack's default exponential backoff. Rate-limit and GraphQL errors are
// deterministic, so they surface immediately.
export function retryNetworkErrors(failureCount: number, error: Error): boolean {
  return error instanceof AniListNetworkError && failureCount < 2;
}

// TanStack derives refetchOnReconnect from networkMode when left unset, and
// the app-wide networkMode "always" (local IPC must run offline) would
// silently disable reconnect refetches, so every hook opts back in.

export function useSearchAnime(filters: SearchAnimeFilters) {
  const hasQuery =
    filters.search.trim().length > 0 ||
    filters.genre !== undefined ||
    filters.season !== undefined ||
    filters.seasonYear !== undefined;
  return useInfiniteQuery({
    queryKey: ["anilist", "search", filters],
    queryFn: ({ pageParam }) => searchAnime(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.hasNextPage ? lastPageParam + 1 : undefined,
    enabled: hasQuery,
    retry: retryNetworkErrors,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useGenreCollection() {
  return useQuery({
    queryKey: ["anilist", "genres"],
    queryFn: genreCollection,
    retry: retryNetworkErrors,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useTrendingAnime() {
  return useQuery({
    queryKey: ["anilist", "trending"],
    queryFn: trendingAnime,
    retry: retryNetworkErrors,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useSeasonalPopularAnime() {
  const { season, seasonYear } = getCurrentSeason();
  return useQuery({
    queryKey: ["anilist", "seasonal", season, seasonYear],
    queryFn: seasonalPopularAnime,
    retry: retryNetworkErrors,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useTopAnime(count: number) {
  return useQuery({
    queryKey: ["anilist", "top", count],
    queryFn: () => topAnime(count),
    retry: retryNetworkErrors,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useAnimeById(id: number) {
  return useQuery({
    queryKey: ["anilist", "anime", id],
    queryFn: () => animeById(id),
    retry: retryNetworkErrors,
    refetchOnReconnect: true,
  });
}
