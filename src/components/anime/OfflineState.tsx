import { RotateCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OfflineStateProps {
  error: Error;
  onRetry: () => void;
}

export function OfflineState({ error, onRetry }: OfflineStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <WifiOff className="size-8 text-muted-foreground" />
      <p className="text-sm font-medium">No connection</p>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button variant="outline" onClick={onRetry}>
        <RotateCcw />
        Retry
      </Button>
    </div>
  );
}
