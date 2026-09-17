import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex items-center justify-center p-8">
      <h1 className="text-3xl font-bold">Home</h1>
    </div>
  );
}
