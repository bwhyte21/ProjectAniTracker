// AniList GraphQL fixtures typed against the app's own interfaces, so
// query-shape changes break compilation instead of silently rotting these.
import type { AniListMedia, AnimeDetailMedia } from "../../src/lib/anilist/types";

// Inline SVG data URIs keep the suite fully offline -- cover images render
// without a single network request.
function cover(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#2f3e46"/><text x="100" y="160" fill="#cad2c5" font-family="sans-serif" font-size="16" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function media(
  id: number,
  romaji: string,
  english: string | null,
  episodes: number | null,
): AniListMedia {
  return {
    id,
    title: { romaji, english },
    coverImage: { large: cover(romaji) },
    episodes,
    season: "FALL",
    seasonYear: 2023,
    averageScore: 87,
    format: "TV",
  };
}

export const frieren = media(21, "Sousou no Frieren", "Frieren: Beyond Journey's End", 12);
export const cowboyBebop = media(1, "Cowboy Bebop", "Cowboy Bebop", 26);
export const spyFamily = media(164636, "Spy x Family", null, 12);

export const searchMedia: AniListMedia[] = [frieren, spyFamily, cowboyBebop];
export const trendingMedia: AniListMedia[] = [cowboyBebop, frieren, spyFamily];
export const seasonalMedia: AniListMedia[] = [spyFamily, frieren];
export const topMedia: AniListMedia[] = [cowboyBebop, frieren, spyFamily];

// Includes "Hentai" so the E2E suite exercises the client-side filter that
// hides it while the mature-content toggle is off (Phase 11).
export const genreCollection: string[] = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Hentai",
];

export const frierenDetail: AnimeDetailMedia = {
  id: 21,
  title: {
    romaji: "Sousou no Frieren",
    english: "Frieren: Beyond Journey's End",
    native: "葬送のフリーレン",
  },
  coverImage: { large: cover("Frieren") },
  episodes: 12,
  status: "FINISHED",
  season: "FALL",
  seasonYear: 2023,
  startDate: { year: 2023, month: 10, day: 6 },
  averageScore: 87,
  format: "TV",
  source: "MANGA",
  genres: ["Adventure", "Drama", "Fantasy"],
  studios: { nodes: [{ name: "Madhouse" }] },
  description:
    "<p>The mage Frieren defeated the Demon King.</p><p>Along the way, she made &amp; kept friends.<br />Eternity passes.</p>",
  relations: {
    edges: [
      {
        relationType: "SEQUEL",
        node: {
          id: 154958,
          type: "ANIME",
          isAdult: false,
          title: { romaji: "Sousou no Frieren Season 2", english: null },
          coverImage: { large: cover("Frieren S2") },
          format: "TV",
          episodes: null,
        },
      },
      {
        relationType: "SOURCE",
        node: {
          id: 100000,
          type: "MANGA",
          isAdult: false,
          title: { romaji: "Sousou no Frieren (manga)", english: null },
          coverImage: { large: cover("manga") },
          format: null,
          episodes: null,
        },
      },
    ],
  },
};
