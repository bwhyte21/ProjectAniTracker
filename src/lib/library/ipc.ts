import { invoke } from "@tauri-apps/api/core";
import type { TrackedAnime, WatchStatus } from "./types";

export interface SaveAnimeArgs {
  anilistId: number;
  title: string;
  coverImageUrl: string;
  episodeCount: number | null;
  season: string | null;
  year: number | null;
  format: string | null;
  status: WatchStatus;
  episodesSeen: number;
}

export interface UpdateWatchStatusArgs {
  anilistId: number;
  status: WatchStatus;
}

export interface UpdateEpisodesSeenArgs {
  anilistId: number;
  episodesSeen: number;
}

export function saveAnime(args: SaveAnimeArgs): Promise<string> {
  return invoke("save_anime", { ...args });
}

export function updateWatchStatus(args: UpdateWatchStatusArgs): Promise<void> {
  return invoke("update_watch_status", { ...args });
}

export function updateEpisodesSeen(
  args: UpdateEpisodesSeenArgs,
): Promise<void> {
  return invoke("update_episodes_seen", { ...args });
}

export function deleteAnime(anilistId: number): Promise<void> {
  return invoke("delete_anime", { anilistId });
}

export function getLibrary(): Promise<TrackedAnime[]> {
  return invoke("get_library");
}

export function getLibraryByStatus(
  status: WatchStatus,
): Promise<TrackedAnime[]> {
  return invoke("get_library_by_status", { status });
}
