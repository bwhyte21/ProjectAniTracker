import { createFileRoute } from "@tanstack/react-router";
import { AnimeGrid } from "@/components/anime/AnimeGrid";
import { OfflineState } from "@/components/anime/OfflineState";
import { RouteError } from "@/components/RouteError";
import { useSeasonalPopularAnime } from "@/lib/anilist/hooks";

export const Route = createFileRoute("/season")({
  component: SeasonPage,
  errorComponent: RouteError,
});

function SeasonPage() {
  const { data, error, isPending, isError, refetch } =
    useSeasonalPopularAnime();

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-3xl font-bold">Popular This Season</h1>
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
