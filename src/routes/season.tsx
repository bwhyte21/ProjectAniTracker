import { createFileRoute } from "@tanstack/react-router";
import { AnimeGrid } from "@/components/anime/AnimeGrid";
import { useSeasonalPopularAnime } from "@/lib/anilist/hooks";

export const Route = createFileRoute("/season")({
  component: SeasonPage,
});

function SeasonPage() {
  const { data, error, isPending, isError } = useSeasonalPopularAnime();

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-3xl font-bold">Popular This Season</h1>
      {isPending && (
        <p className="text-sm text-muted-foreground">
          Loading seasonal anime...
        </p>
      )}
      {isError && (
        <p className="text-sm text-muted-foreground">
          Failed to load seasonal anime: {error.message}
        </p>
      )}
      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground">No anime found.</p>
      )}
      {data && data.length > 0 && <AnimeGrid media={data} />}
    </div>
  );
}
