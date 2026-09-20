import { createFileRoute } from "@tanstack/react-router";
import { AnimeCarousel } from "@/components/anime/AnimeCarousel";
import { RouteError } from "@/components/RouteError";
import {
  useSeasonalPopularAnime,
  useTopAnime,
  useTrendingAnime,
} from "@/lib/anilist/hooks";

export const Route = createFileRoute("/")({
  component: HomePage,
  errorComponent: RouteError,
});

function HomePage() {
  const seasonalQuery = useSeasonalPopularAnime();
  const trendingQuery = useTrendingAnime();
  const topQuery = useTopAnime(25);

  return (
    <div className="flex flex-col gap-10 p-8">
      <AnimeCarousel
        title="Popular This Season"
        viewMoreTo="/season"
        query={seasonalQuery}
      />
      <AnimeCarousel
        title="Trending Now"
        viewMoreTo="/trending"
        query={trendingQuery}
      />
      <AnimeCarousel title="Top Series" viewMoreTo="/top" query={topQuery} />
    </div>
  );
}
