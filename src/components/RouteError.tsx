export function RouteError({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  return (
    <div className="p-8">
      <p className="text-sm text-muted-foreground">Failed to load: {message}</p>
    </div>
  );
}
