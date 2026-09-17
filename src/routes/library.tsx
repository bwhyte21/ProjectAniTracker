import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/library")({
  validateSearch: (search: Record<string, unknown>) => ({
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { status } = Route.useSearch();

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8">
      <h1 className="text-3xl font-bold">Library</h1>
      {status && <p className="text-muted-foreground">Status: {status}</p>}
    </div>
  );
}
