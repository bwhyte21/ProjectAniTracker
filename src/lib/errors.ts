import { error as logError } from "@tauri-apps/plugin-log";
import { toast } from "sonner";

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  // Rust IPC commands reject with a plain string (Result<T, String>).
  if (typeof error === "string" && error.length > 0) {
    return error;
  }
  return "An unexpected error occurred.";
}

// Single funnel for every surfaced error (ADR-0010): toast for the user,
// log file for diagnosis. Called from the QueryCache/MutationCache onError
// handlers in main.tsx and from RouteError -- nowhere else.
export function reportError(error: unknown): void {
  toast.error(errorMessage(error));
  const detail = error instanceof Error && error.stack ? error.stack : String(error);
  logError(detail).catch(() => {
    // Logging must never break the app: the plain browser build (E2E, dev
    // outside the Tauri webview) has no IPC backend to receive the command.
  });
}
