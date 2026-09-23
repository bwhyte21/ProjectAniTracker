import { Link } from "@tanstack/react-router";
import { CoverImage } from "@/components/anime/CoverImage";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AniListMedia } from "@/lib/anilist/types";

interface AnimeCardProps {
  media: AniListMedia;
}

export function animeCardTitle(media: AniListMedia): string {
  return media.title.english ?? media.title.romaji ?? "Unknown title";
}

export function AnimeCard({ media }: AnimeCardProps) {
  const title = animeCardTitle(media);
  const cover = media.coverImage?.large;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/anime/$id"
          params={{ id: String(media.id) }}
          className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Card className="h-full gap-2 py-0 transition-colors group-hover:bg-muted/50 group-focus-visible:bg-muted/50">
            <CoverImage
              src={cover}
              alt={`Cover image for ${title}`}
              className="aspect-[2/3] w-full object-cover"
            />
            <div className="flex flex-col gap-1 px-3 py-3">
              <h3 className="line-clamp-2 text-sm leading-snug font-medium">{title}</h3>
              <p className="text-xs text-muted-foreground">
                {media.episodes ? `${media.episodes} episodes` : "Episodes TBA"}
              </p>
            </div>
          </Card>
        </Link>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}
