import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
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
    retry: false,
  });
}

export function useGenreCollection() {
  return useQuery({
    queryKey: ["anilist", "genres"],
    queryFn: genreCollection,
    retry: false,
  });
}

export function useTrendingAnime() {
  return useQuery({
    queryKey: ["anilist", "trending"],
    queryFn: trendingAnime,
    retry: false,
  });
}

export function useSeasonalPopularAnime() {
  const { season, seasonYear } = getCurrentSeason();
  return useQuery({
    queryKey: ["anilist", "seasonal", season, seasonYear],
    queryFn: seasonalPopularAnime,
    retry: false,
  });
}

export function useTopAnime(count: number) {
  return useQuery({
    queryKey: ["anilist", "top", count],
    queryFn: () => topAnime(count),
    retry: false,
  });
}

export function useAnimeById(id: number) {
  return useQuery({
    queryKey: ["anilist", "anime", id],
    queryFn: () => animeById(id),
    retry: false,
  });
}
