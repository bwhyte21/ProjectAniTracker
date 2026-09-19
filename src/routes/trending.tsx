import { createFileRoute } from "@tanstack/react-router";
import { useTrendingAnime } from "@/lib/anilist/hooks";

export const Route = createFileRoute("/trending")({
  component: TrendingPage,
});

function TrendingPage() {
  const { data, error, isPending, isError } = useTrendingAnime();

  if (isPending) {
    return <p className="p-8">Loading trending anime...</p>;
  }

  if (isError) {
    return (
      <p className="p-8">Failed to load trending anime: {error.message}</p>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Trending</h1>
      <ul className="mt-4 space-y-1">
        {data.map((media) => (
          <li key={media.id}>
            {media.title.romaji} | {media.coverImage?.large ?? "no cover"} |{" "}
            {media.episodes ?? "?"} episodes
          </li>
        ))}
      </ul>
    </div>
  );
}
