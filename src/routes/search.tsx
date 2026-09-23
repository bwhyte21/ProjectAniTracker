import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimeGrid } from "@/components/anime/AnimeGrid";
import { OfflineNotice, OfflineState } from "@/components/anime/OfflineState";
import { RouteError } from "@/components/RouteError";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGenreCollection, useSearchAnime } from "@/lib/anilist/hooks";
import type { MediaSeason } from "@/lib/anilist/types";

const SEASON_OPTIONS: readonly MediaSeason[] = ["WINTER", "SPRING", "SUMMER", "FALL"];
const MIN_YEAR = 1960;
const DEBOUNCE_MS = 400;
const ANY = "all";

// validateSearch receives a number from programmatic navigation and a string
// when the URL is parsed (initial load, back/forward).
function parseYear(value: unknown): number | undefined {
  const year =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;
  if (!Number.isInteger(year) || year < MIN_YEAR || year > new Date().getFullYear() + 1) {
    return undefined;
  }
  return year;
}

function seasonLabel(season: MediaSeason): string {
  return season[0] + season.slice(1).toLowerCase();
}

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" && search.q.trim().length > 0 ? search.q : undefined,
    genre: typeof search.genre === "string" && search.genre.length > 0 ? search.genre : undefined,
    season:
      typeof search.season === "string" && SEASON_OPTIONS.includes(search.season as MediaSeason)
        ? (search.season as MediaSeason)
        : undefined,
    year: parseYear(search.year),
  }),
  component: SearchPage,
  errorComponent: RouteError,
});

function SearchPage() {
  const { q, genre, season, year } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [input, setInput] = useState(q ?? "");
  const { data: genres } = useGenreCollection();
  const {
    data,
    error,
    isPending,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useSearchAnime({
    search: q ?? "",
    genre,
    season,
    seasonYear: year,
  });

  const hasFilters = genre !== undefined || season !== undefined || year !== undefined;
  const media = data?.pages.flatMap((page) => page.media) ?? [];

  useEffect(() => {
    if (input.trim() === (q ?? "")) {
      return;
    }
    const timer = setTimeout(() => {
      const query = input.trim();
      navigate({
        to: "/search",
        search: (prev) => ({
          ...prev,
          q: query.length > 0 ? query : undefined,
        }),
        replace: true,
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input, q, navigate]);

  useEffect(() => {
    if ((q ?? "") !== input.trim()) {
      setInput(q ?? "");
    }
  }, [q]);

  function updateFilters(patch: { genre?: string; season?: MediaSeason; year?: number }) {
    navigate({ to: "/search", search: (prev) => ({ ...prev, ...patch }) });
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-3xl font-bold">Search</h1>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Search anime by name"
          aria-label="Search anime"
          className="max-w-md"
        />
        <Select
          value={genre ?? ANY}
          onValueChange={(value) => updateFilters({ genre: value === ANY ? undefined : value })}
        >
          <SelectTrigger className="w-36" aria-label="Genre">
            <SelectValue placeholder="Genre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any genre</SelectItem>
            {(genres ?? []).map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={season ?? ANY}
          onValueChange={(value) =>
            updateFilters({
              season: value === ANY ? undefined : (value as MediaSeason),
            })
          }
        >
          <SelectTrigger className="w-32" aria-label="Season">
            <SelectValue placeholder="Season" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any season</SelectItem>
            {SEASON_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {seasonLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={year === undefined ? ANY : String(year)}
          onValueChange={(value) =>
            updateFilters({ year: value === ANY ? undefined : Number(value) })
          }
        >
          <SelectTrigger className="w-28" aria-label="Year">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any year</SelectItem>
            {Array.from(
              { length: new Date().getFullYear() + 1 - MIN_YEAR + 1 },
              (_, index) => new Date().getFullYear() + 1 - index,
            ).map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!q && !hasFilters && (
        <p className="text-sm text-muted-foreground">Type to search for anime.</p>
      )}
      {(q || hasFilters) && isPending && (
        <p className="text-sm text-muted-foreground">Searching...</p>
      )}
      {isError && media.length === 0 && <OfflineState error={error} onRetry={refetch} />}
      {isError && media.length > 0 && <OfflineNotice message={error.message} onRetry={refetch} />}
      {!isPending && !isError && media.length === 0 && (
        <p className="text-sm text-muted-foreground">No anime found.</p>
      )}
      {media.length > 0 && (
        <>
          <AnimeGrid media={media} />
          <InfiniteScrollSentinel
            enabled={hasNextPage && !isFetchingNextPage}
            onLoadMore={fetchNextPage}
          />
        </>
      )}
      {isFetchingNextPage && <p className="text-sm text-muted-foreground">Loading more...</p>}
    </div>
  );
}

interface InfiniteScrollSentinelProps {
  enabled: boolean;
  onLoadMore: () => void;
}

function InfiniteScrollSentinel({ enabled, onLoadMore }: InfiniteScrollSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, onLoadMore]);

  return <div ref={ref} aria-hidden="true" className="h-1" />;
}
