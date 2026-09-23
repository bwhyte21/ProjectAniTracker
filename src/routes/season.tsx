import { createFileRoute } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { AnimeGrid } from "@/components/anime/AnimeGrid";
import { OfflineState } from "@/components/anime/OfflineState";
import { RouteError } from "@/components/RouteError";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSeasonalPopularAnime } from "@/lib/anilist/hooks";
import { SEASON_LABELS, getCurrentSeason } from "@/lib/anilist/season";

export const Route = createFileRoute("/season")({
  component: SeasonPage,
  errorComponent: RouteError,
});

function SeasonPage() {
  const { data, error, isPending, isError, refetch } =
    useSeasonalPopularAnime();
  const { season, seasonYear } = getCurrentSeason();

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-3xl font-bold">
        Popular This Season
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              className="ms-[1em] inline-flex items-center gap-1.5 text-2xl font-normal text-muted-foreground"
            >
              {SEASON_LABELS[season]} {seasonYear}
              <Info className="size-4" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            The season currently airing. The winter block starts in December, so
            it carries the next year's label.
          </TooltipContent>
        </Tooltip>
      </h1>
      {isPending && (
        <p className="text-sm text-muted-foreground">
          Loading seasonal anime...
        </p>
      )}
      {isError && <OfflineState error={error} onRetry={refetch} />}
      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground">No anime found.</p>
      )}
      {data && data.length > 0 && <AnimeGrid media={data} />}
    </div>
  );
}
