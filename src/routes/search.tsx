import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimeGrid } from "@/components/anime/AnimeGrid";
import { OfflineState } from "@/components/anime/OfflineState";
import { RouteError } from "@/components/RouteError";
import { Input } from "@/components/ui/input";
import { useSearchAnime } from "@/lib/anilist/hooks";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q:
      typeof search.q === "string" && search.q.trim().length > 0
        ? search.q
        : undefined,
  }),
  component: SearchPage,
  errorComponent: RouteError,
});

const DEBOUNCE_MS = 400;

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [input, setInput] = useState(q ?? "");
  const { data, error, isPending, isError, refetch } = useSearchAnime(q ?? "");

  useEffect(() => {
    const timer = setTimeout(() => {
      const query = input.trim();
      if (query !== (q ?? "")) {
        navigate({
          to: "/search",
          search: { q: query.length > 0 ? query : undefined },
          replace: true,
        });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input, q, navigate]);

  useEffect(() => {
    if ((q ?? "") !== input.trim()) {
      setInput(q ?? "");
    }
  }, [q]);

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
      {(q ?? "").length === 0 && (
        <p className="text-sm text-muted-foreground">
          Type to search for anime.
        </p>
      )}
      {(q ?? "").length > 0 && isPending && (
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
