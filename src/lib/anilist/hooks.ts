import { useQuery } from "@tanstack/react-query";
import {
  searchAnime,
  seasonalPopularAnime,
  topAnime,
  trendingAnime,
} from "./queries";
import { getCurrentSeason } from "./season";

export function useSearchAnime(search: string) {
  return useQuery({
    queryKey: ["anilist", "search", search],
    queryFn: () => searchAnime(search),
    enabled: search.trim().length > 0,
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
