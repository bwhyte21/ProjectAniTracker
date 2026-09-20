export const WATCH_STATUSES = [
  "currently-watching",
  "plan-to-watch",
  "completed",
  "paused",
  "dropped",
] as const;

export type WatchStatus = (typeof WATCH_STATUSES)[number];

export const WATCH_STATUS_LABELS: Record<WatchStatus, string> = {
  "currently-watching": "Currently Watching",
  "plan-to-watch": "Plan to Watch",
  completed: "Completed",
  paused: "Paused",
  dropped: "Dropped",
};

export function isWatchStatus(value: string): value is WatchStatus {
  return (WATCH_STATUSES as readonly string[]).includes(value);
}

export interface TrackedAnime {
  anilist_id: number;
  title: string;
  cover_image_path: string;
  episode_count: number | null;
  season: string | null;
  year: number | null;
  format: string | null;
  status: WatchStatus;
  episodes_seen: number;
  saved_at: string;
}
