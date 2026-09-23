import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { relatedAnime } from "../../src/lib/anilist/queries";
import type { AnimeDetailMedia, RelatedMediaEdge } from "../../src/lib/anilist/types";

const MATURE_CONTENT_KEY = "anitracker-mature-content";

function edge(
  id: number,
  relationType: RelatedMediaEdge["relationType"],
  overrides: Partial<RelatedMediaEdge["node"]> = {},
): RelatedMediaEdge {
  return {
    relationType,
    node: {
      id,
      type: "ANIME",
      isAdult: false,
      title: { romaji: `Anime ${id}`, english: null },
      coverImage: { large: `cover-${id}` },
      format: "TV",
      episodes: 12,
      ...overrides,
    },
  };
}

function detail(edges: RelatedMediaEdge[]): AnimeDetailMedia {
  return {
    id: 1,
    title: { romaji: "Parent Show", english: "Parent Show", native: null },
    coverImage: { large: "cover-1" },
    episodes: 12,
    status: "FINISHED",
    season: "FALL",
    seasonYear: 2023,
    startDate: { year: 2023, month: 10, day: 6 },
    averageScore: 85,
    format: "TV",
    source: "MANGA",
    genres: ["Adventure"],
    studios: { nodes: [{ name: "Madhouse" }] },
    description: "A show.",
    relations: { edges },
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("relatedAnime", () => {
  it("keeps tracked relation types and drops the rest", () => {
    const result = relatedAnime(
      detail([
        edge(2, "SEQUEL"),
        edge(3, "PREQUEL"),
        edge(4, "SIDE_STORY"),
        edge(5, "SOURCE"),
        edge(6, "ADAPTATION"),
        edge(7, "CHARACTER"),
      ]),
    );
    expect(result.map((media) => media.id)).toEqual([2, 3, 4]);
  });

  it("drops non-anime nodes", () => {
    const result = relatedAnime(detail([edge(2, "SEQUEL", { type: "MANGA" }), edge(3, "SEQUEL")]));
    expect(result.map((media) => media.id)).toEqual([3]);
  });

  it("drops adult entries while the mature-content toggle is off", () => {
    const result = relatedAnime(
      detail([edge(2, "SEQUEL", { isAdult: true }), edge(3, "SEQUEL", { isAdult: null })]),
    );
    expect(result.map((media) => media.id)).toEqual([3]);
  });

  it("keeps adult entries while the mature-content toggle is on", () => {
    localStorage.setItem(MATURE_CONTENT_KEY, "true");
    const result = relatedAnime(detail([edge(2, "SEQUEL", { isAdult: true })]));
    expect(result.map((media) => media.id)).toEqual([2]);
  });

  it("passes node fields through and nulls season fields", () => {
    const result = relatedAnime(detail([edge(2, "SEQUEL", { episodes: 24, format: "MOVIE" })]));
    expect(result).toEqual([
      {
        id: 2,
        title: { romaji: "Anime 2", english: null },
        coverImage: { large: "cover-2" },
        episodes: 24,
        season: null,
        seasonYear: null,
        averageScore: null,
        format: "MOVIE",
      },
    ]);
  });

  it("returns an empty list when there are no relations", () => {
    expect(relatedAnime(detail([]))).toEqual([]);
    expect(relatedAnime({ ...detail([]), relations: null })).toEqual([]);
  });
});
