import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

// Mirrors the Rust DbLocation payload: snake_case on both sides (AGENTS.md).
export interface DbLocation {
  path: string;
  is_default: boolean;
  fell_back: boolean;
}

export function getDbLocation(): Promise<DbLocation> {
  return invoke("get_db_location");
}

// A same-directory pick resolves as a no-op so the caller can show its
// "already using this location" toast; a successful move restarts the
// app before the promise resolves. Passing no directory resets to the
// app-config default.
export function setDbLocation(dir?: string): Promise<void> {
  return invoke("set_db_location", { dir: dir ?? null });
}

export function pickDbDirectory(): Promise<string | null> {
  return open({ directory: true, title: "Choose database location" });
}
