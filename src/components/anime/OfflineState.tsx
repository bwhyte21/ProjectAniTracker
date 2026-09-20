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

interface OfflineNoticeProps {
  message?: string;
  onRetry?: () => void;
}

export function OfflineNotice({ message, onRetry }: OfflineNoticeProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <WifiOff className="size-4 text-muted-foreground" />
      <span className="font-medium">No connection</span>
      {message && <span className="text-muted-foreground">{message}</span>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw />
          Retry
        </Button>
      )}
    </div>
  );
}
