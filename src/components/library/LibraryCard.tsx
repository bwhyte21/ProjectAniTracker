import { Link } from "@tanstack/react-router";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Card } from "@/components/ui/card";
import { WATCH_STATUS_LABELS, type TrackedAnime } from "@/lib/library/types";

interface LibraryCardProps {
  anime: TrackedAnime;
}

export function LibraryCard({ anime }: LibraryCardProps) {
  return (
    <Link
      to="/anime/$id"
      params={{ id: String(anime.anilist_id) }}
      className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full gap-2 py-0 transition-colors group-hover:bg-muted/50 group-focus-visible:bg-muted/50">
        <img
          src={convertFileSrc(anime.cover_image_path)}
          alt={`Cover image for ${anime.title}`}
          className="aspect-[2/3] w-full object-cover"
          loading="lazy"
        />
        <div className="flex flex-col gap-1 px-3 py-3">
          <h3 className="line-clamp-2 text-sm leading-snug font-medium">
            {anime.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {anime.episode_count !== null
              ? `${anime.episodes_seen} / ${anime.episode_count} episodes`
              : `${anime.episodes_seen} episodes`}
          </p>
          <p className="text-xs text-muted-foreground">
            {WATCH_STATUS_LABELS[anime.status]}
          </p>
        </div>
      </Card>
    </Link>
  );
}
