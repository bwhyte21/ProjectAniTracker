import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/season")({
  component: SeasonPage,
});

function SeasonPage() {
  return (
    <div className="flex items-center justify-center p-8">
      <h1 className="text-3xl font-bold">Season</h1>
    </div>
  );
}
