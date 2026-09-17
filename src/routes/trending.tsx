import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/trending")({
  component: TrendingPage,
});

function TrendingPage() {
  return (
    <div className="flex items-center justify-center p-8">
      <h1 className="text-3xl font-bold">Trending</h1>
    </div>
  );
}
