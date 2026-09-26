import { mockConvertFileSrc, mockIPC } from "@tauri-apps/api/mocks";
import type { Page, Route } from "@playwright/test";
import {
  frierenDetail,
  genreCollection,
  searchMedia,
  seasonalMedia,
  topMedia,
  trendingMedia,
} from "./fixtures";

export const ANILIST_ENDPOINT = "https://graphql.anilist.co";

// Payloads arrive in camelCase exactly as the frontend sends them (Tauri's
// real arg conversion never runs in the browser build).
interface IpcPayload {
  anilistId?: number;
  title?: string;
  episodeCount?: number | null;
  season?: string | null;
  year?: number | null;
  format?: string | null;
  status?: string;
  episodesSeen?: number;
  dir?: string | null;
}

// The row shape Rust returns: snake_case on both sides (AGENTS.md).
interface MockLibraryRow {
  anilist_id: number;
  title: string;
  cover_image_path: string;
  episode_count: number | null;
  season: string | null;
  year: number | null;
  format: string | null;
  status: string;
  episodes_seen: number;
  saved_at: string;
  updated_at: string;
}

// The DbLocation shape Rust returns: snake_case on both sides (AGENTS.md).
interface MockDbLocation {
  path: string;
  is_default: boolean;
  fell_back: boolean;
}

// Runs inside the browser via addInitScript, so it must stay self-contained:
// no imports, no closures over Node-side values. State lives on window, which
// persists across client-side SPA navigations within one page.
function ipcHandler(cmd: string, payload: IpcPayload | undefined): unknown {
  const w = window as typeof window & {
    __E2E_LIBRARY?: MockLibraryRow[];
    __E2E_FAIL_SAVE?: boolean;
    __E2E_DB_LOCATION?: MockDbLocation;
    __E2E_DB_PICK?: string | null;
    __E2E_DB_SET_CALLS?: (string | null)[];
  };
  const db = (w.__E2E_LIBRARY ??= []);
  switch (cmd) {
    case "get_library":
      return db;
    case "get_library_by_status":
      return db.filter((row) => row.status === payload?.status);
    case "save_anime": {
      // Tests set this flag to exercise the error-toast path (Phase 20).
      if (w.__E2E_FAIL_SAVE) {
        throw new Error("mock save failed");
      }
      const row: MockLibraryRow = {
        anilist_id: payload?.anilistId ?? 0,
        title: payload?.title ?? "",
        cover_image_path: `covers/${payload?.anilistId ?? 0}.jpg`,
        episode_count: payload?.episodeCount ?? null,
        season: payload?.season ?? null,
        year: payload?.year ?? null,
        format: payload?.format ?? null,
        status: payload?.status ?? "",
        episodes_seen: payload?.episodesSeen ?? 0,
        saved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const index = db.findIndex((existing) => existing.anilist_id === row.anilist_id);
      if (index === -1) {
        db.push(row);
      } else {
        db[index] = row;
      }
      return row.cover_image_path;
    }
    case "update_watch_status": {
      const row = db.find((existing) => existing.anilist_id === payload?.anilistId);
      if (row && payload?.status) {
        row.status = payload.status;
        row.updated_at = new Date().toISOString();
      }
      return null;
    }
    case "update_episodes_seen": {
      const row = db.find((existing) => existing.anilist_id === payload?.anilistId);
      if (row) {
        row.episodes_seen = payload?.episodesSeen ?? 0;
        row.updated_at = new Date().toISOString();
      }
      return null;
    }
    case "delete_anime": {
      const index = db.findIndex((existing) => existing.anilist_id === payload?.anilistId);
      if (index !== -1) {
        db.splice(index, 1);
      }
      return null;
    }
    case "get_build_info":
      return { version: "0.1.0", git_commit: "e2e-mock", platform: "linux" };
    case "get_db_location":
      // Inlined, not a module constant: the handler is serialized into
      // the browser init script, where module scope does not exist.
      return (
        w.__E2E_DB_LOCATION ?? {
          path: "/home/user/.config/com.bryan.anitracker",
          is_default: true,
          fell_back: false,
        }
      );
    case "set_db_location":
      (w.__E2E_DB_SET_CALLS ??= []).push(payload?.dir ?? null);
      return null;
    // The settings folder picker (tauri-plugin-dialog) also rides the
    // IPC channel; tests set __E2E_DB_PICK to simulate a chosen
    // directory and leave it unset to simulate cancelling the picker.
    case "plugin:dialog|open":
      return w.__E2E_DB_PICK ?? null;
    // The app logs surfaced errors through tauri-plugin-log's JS bindings
    // (Phase 20); accept the command so the browser build's log calls
    // resolve instead of rejecting into their silent catch.
    case "plugin:log|log":
      return null;
    default:
      throw new Error(`unexpected IPC command: ${cmd}`);
  }
}

// mockIPC and mockConvertFileSrc call this module-private helper from
// @tauri-apps/api/mocks, which is not part of their serialized source -- it
// is embedded alongside them so the init script is self-contained.
function mockInternals(): void {
  const w = window as typeof window & {
    __TAURI_INTERNALS__?: Record<string, unknown>;
    __TAURI_EVENT_PLUGIN_INTERNALS__?: { unregisterListener: () => void };
  };
  w.__TAURI_INTERNALS__ ??= {};
  // @tauri-apps/api 2.11 declares this with a required unregisterListener;
  // mockIPC replaces the seed with its own implementation right after.
  w.__TAURI_EVENT_PLUGIN_INTERNALS__ ??= { unregisterListener: () => {} };
}

// mockIPC and mockConvertFileSrc only touch `window`, so their sources can be
// embedded in an init script that runs before the app boots. The handler is
// passed as the callback mockIPC installs on window.__TAURI_INTERNALS__.
export async function installIpcMock(page: Page): Promise<void> {
  const script = [
    `${mockInternals.toString()};`,
    `(${mockIPC.toString()})(${ipcHandler.toString()});`,
    `(${mockConvertFileSrc.toString()})("linux");`,
  ].join("\n");
  await page.addInitScript(script);
}

// Serves one AniList GraphQL operation from typed fixtures, keyed on the
// operation name embedded in the query text.
async function fulfillAniList(route: Route): Promise<void> {
  const body = JSON.parse(route.request().postData() ?? "{}") as { query?: string };
  const query = body.query ?? "";
  let data: Record<string, unknown>;
  if (query.includes("SearchAnime")) {
    data = { Page: { pageInfo: { hasNextPage: false }, media: searchMedia } };
  } else if (query.includes("GenreCollection")) {
    data = { GenreCollection: genreCollection };
  } else if (query.includes("TrendingAnime")) {
    data = { Page: { media: trendingMedia } };
  } else if (query.includes("SeasonalPopularAnime")) {
    data = { Page: { media: seasonalMedia } };
  } else if (query.includes("TopAnime")) {
    data = { Page: { media: topMedia } };
  } else if (query.includes("AnimeDetail")) {
    data = { Media: frierenDetail };
  } else {
    return route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ errors: [{ message: `unexpected query: ${query.slice(0, 60)}` }] }),
    });
  }
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data }),
  });
}

// Serves every AniList GraphQL operation from typed fixtures via route
// interception.
export async function installAniListMock(page: Page): Promise<void> {
  await page.route(ANILIST_ENDPOINT, fulfillAniList);
}

// Simulates AniList being unreachable so the offline states render.
export async function abortAniList(page: Page): Promise<void> {
  await page.route(ANILIST_ENDPOINT, (route) => route.abort());
}

// Simulates a transient connectivity blip (Phase 21): the first `failures`
// requests abort like a dropped connection, then AniList serves fixtures
// normally so the automatic retries recover without user action.
export async function installFlakyAniList(page: Page, failures: number): Promise<void> {
  let remaining = failures;
  await page.route(ANILIST_ENDPOINT, async (route) => {
    if (remaining > 0) {
      remaining -= 1;
      return route.abort();
    }
    return fulfillAniList(route);
  });
}

// Serves a 429 with a Retry-After header; returns the number of requests
// seen, so tests can prove rate-limit errors never auto-retry. Retry-After
// must be CORS-exposed or the browser hides it from the app's fetch.
export async function rateLimitAniList(page: Page): Promise<() => number> {
  let requests = 0;
  await page.route(ANILIST_ENDPOINT, (route) => {
    requests += 1;
    return route.fulfill({
      status: 429,
      headers: { "Retry-After": "30", "Access-Control-Expose-Headers": "Retry-After" },
    });
  });
  return () => requests;
}
