import { mockConvertFileSrc, mockIPC } from "@tauri-apps/api/mocks";
import type { Page } from "@playwright/test";
import {
  frierenDetail,
  genreCollection,
  searchMedia,
  seasonalMedia,
  topMedia,
  trendingMedia,
} from "./fixtures";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

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
}

// Runs inside the browser via addInitScript, so it must stay self-contained:
// no imports, no closures over Node-side values. State lives on window, which
// persists across client-side SPA navigations within one page.
function ipcHandler(cmd: string, payload: IpcPayload | undefined): unknown {
  const w = window as typeof window & {
    __E2E_LIBRARY?: MockLibraryRow[];
    __E2E_FAIL_SAVE?: boolean;
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
      }
      return null;
    }
    case "update_episodes_seen": {
      const row = db.find((existing) => existing.anilist_id === payload?.anilistId);
      if (row) {
        row.episodes_seen = payload?.episodesSeen ?? 0;
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

// Serves every AniList GraphQL operation from typed fixtures via route
// interception, keyed on the operation name embedded in the query text.
export async function installAniListMock(page: Page): Promise<void> {
  await page.route(ANILIST_ENDPOINT, (route) => {
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
  });
}

// Simulates AniList being unreachable so the offline states render.
export async function abortAniList(page: Page): Promise<void> {
  await page.route(ANILIST_ENDPOINT, (route) => route.abort());
}
