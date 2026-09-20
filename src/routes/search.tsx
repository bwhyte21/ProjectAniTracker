import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimeGrid } from "@/components/anime/AnimeGrid";
import { OfflineState } from "@/components/anime/OfflineState";
import { RouteError } from "@/components/RouteError";
import { Input } from "@/components/ui/input";
import { useSearchAnime } from "@/lib/anilist/hooks";

export const Route = createFileRoute("/search")({
  component: SearchPage,
  errorComponent: RouteError,
});

const DEBOUNCE_MS = 400;

function SearchPage() {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const { data, error, isPending, isError, refetch } = useSearchAnime(search);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-3xl font-bold">Search</h1>
      <Input
        type="search"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Search anime by name"
        aria-label="Search anime"
        className="max-w-md"
      />
      {search.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Type to search for anime.
        </p>
      )}
      {search.length > 0 && isPending && (
        <p className="text-sm text-muted-foreground">Searching...</p>
      )}
      {isError && <OfflineState error={error} onRetry={refetch} />}
      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground">No anime found.</p>
      )}
      {data && data.length > 0 && <AnimeGrid media={data} />}
    </div>
  );
}
