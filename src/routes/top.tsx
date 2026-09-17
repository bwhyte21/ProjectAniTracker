import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/top")({
  component: TopPage,
});

function TopPage() {
  return (
    <div className="flex items-center justify-center p-8">
      <h1 className="text-3xl font-bold">Top</h1>
    </div>
  );
}
