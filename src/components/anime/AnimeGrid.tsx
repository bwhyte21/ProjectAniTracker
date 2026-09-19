import { AnimeCard } from "@/components/anime/AnimeCard";
import type { AniListMedia } from "@/lib/anilist/types";

interface AnimeGridProps {
  media: AniListMedia[];
}

export function AnimeGrid({ media }: AnimeGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {media.map((item) => (
        <AnimeCard key={item.id} media={item} />
      ))}
    </div>
  );
}
