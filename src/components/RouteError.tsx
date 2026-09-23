import { errorMessage, reportError } from "@/lib/errors";

export function RouteError({ error }: { error: unknown }) {
  reportError(error);

  return (
    <div className="p-8">
      <p className="text-sm text-muted-foreground">Failed to load: {errorMessage(error)}</p>
    </div>
  );
}
