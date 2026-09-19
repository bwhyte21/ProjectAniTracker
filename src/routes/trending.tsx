import { createFileRoute } from "@tanstack/react-router";
import { AnimeGrid } from "@/components/anime/AnimeGrid";
import { useTrendingAnime } from "@/lib/anilist/hooks";

export const Route = createFileRoute("/trending")({
  component: TrendingPage,
});

function TrendingPage() {
  const { data, error, isPending, isError } = useTrendingAnime();

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-3xl font-bold">Trending Now</h1>
      {isPending && (
        <p className="text-sm text-muted-foreground">
          Loading trending anime...
        </p>
      )}
      {isError && (
        <p className="text-sm text-muted-foreground">
          Failed to load trending anime: {error.message}
        </p>
      )}
      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground">No anime found.</p>
      )}
      {data && data.length > 0 && <AnimeGrid media={data} />}
    </div>
  );
}
