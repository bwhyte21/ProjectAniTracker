import { createFileRoute, Link } from "@tanstack/react-router";
import { OfflineNotice } from "@/components/anime/OfflineState";
import { LibraryCard } from "@/components/library/LibraryCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOnline } from "@/hooks/useOnline";
import { useLibrary } from "@/lib/library/hooks";
import { isWatchStatus, type WatchStatus } from "@/lib/library/types";

const LIBRARY_TABS: { value: WatchStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "currently-watching", label: "Currently Watching" },
  { value: "plan-to-watch", label: "Plan to Watch" },
  { value: "completed", label: "Completed" },
  { value: "paused", label: "Paused" },
  { value: "dropped", label: "Dropped" },
];

export const Route = createFileRoute("/library")({
  validateSearch: (search: Record<string, unknown>) => ({
    status:
      typeof search.status === "string" && isWatchStatus(search.status)
        ? search.status
        : undefined,
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { status } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data, error, isPending, isError } = useLibrary(status);
  const online = useOnline();

  function handleTabChange(value: string) {
    navigate({
      to: "/library",
      search:
        value === "all"
          ? { status: undefined }
          : { status: value as WatchStatus },
    });
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-3xl font-bold">Library</h1>
      <Tabs value={status ?? "all"} onValueChange={handleTabChange}>
        <TabsList>
          {LIBRARY_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {!online && <OfflineNotice />}
      {isPending && (
        <p className="text-sm text-muted-foreground">Loading library...</p>
      )}
      {isError && (
        <p className="text-sm text-muted-foreground">
          Failed to load library: {error.message}
        </p>
      )}
      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing here yet.{" "}
          <Link
            to="/"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Browse to add anime.
          </Link>
        </p>
      )}
      {data && data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {data.map((anime) => (
            <LibraryCard key={anime.anilist_id} anime={anime} />
          ))}
        </div>
      )}
    </div>
  );
}
