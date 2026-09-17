import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/anime/$id")({
  component: AnimeDetailPage,
});

function AnimeDetailPage() {
  const { id } = Route.useParams();

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8">
      <h1 className="text-3xl font-bold">Anime Detail</h1>
      <p className="text-muted-foreground">ID: {id}</p>
    </div>
  );
}
