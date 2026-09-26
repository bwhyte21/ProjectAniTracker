import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  open: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mocks.invoke,
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: mocks.open,
}));

import {
  getDbLocation,
  pickDbDirectory,
  setDbLocation,
  type DbLocation,
} from "../../src/lib/db-location";

// Mirrors the DbLocation payload Rust returns: snake_case on both
// sides (AGENTS.md).
const dbLocation: DbLocation = {
  path: "/media/anime-db",
  is_default: false,
  fell_back: true,
};

beforeEach(() => {
  mocks.invoke.mockReset();
  mocks.open.mockReset();
});

describe("getDbLocation", () => {
  it("invokes get_db_location and returns the snake_case payload", async () => {
    mocks.invoke.mockResolvedValue(dbLocation);

    const result = await getDbLocation();

    expect(mocks.invoke).toHaveBeenCalledWith("get_db_location");
    expect(result).toEqual({ path: "/media/anime-db", is_default: false, fell_back: true });
    expect("isDefault" in result).toBe(false);
    expect("fellBack" in result).toBe(false);
  });
});

describe("setDbLocation", () => {
  it("sends the chosen directory as the dir payload", async () => {
    mocks.invoke.mockResolvedValue(undefined);

    await setDbLocation("/media/anime-db");

    expect(mocks.invoke).toHaveBeenCalledWith("set_db_location", { dir: "/media/anime-db" });
  });

  it("sends a null dir payload for the reset flow", async () => {
    mocks.invoke.mockResolvedValue(undefined);

    await setDbLocation();

    expect(mocks.invoke).toHaveBeenCalledWith("set_db_location", { dir: null });
  });
});

describe("pickDbDirectory", () => {
  it("opens a native directory picker and returns the pick", async () => {
    mocks.open.mockResolvedValue("/media/anime-db");

    const picked = await pickDbDirectory();

    expect(mocks.open).toHaveBeenCalledWith({
      directory: true,
      title: "Choose database location",
    });
    expect(picked).toBe("/media/anime-db");
  });

  it("returns null when the picker is cancelled", async () => {
    mocks.open.mockResolvedValue(null);

    const picked = await pickDbDirectory();

    expect(picked).toBeNull();
  });
});
