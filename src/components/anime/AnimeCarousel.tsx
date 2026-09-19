import type { UseQueryResult } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { AnimeCard } from "@/components/anime/AnimeCard";
import type { AniListMedia } from "@/lib/anilist/types";

interface AnimeCarouselProps {
  title: string;
  viewMoreTo: "/season" | "/trending" | "/top";
  query: UseQueryResult<AniListMedia[], Error>;
}

export function AnimeCarousel({ title, viewMoreTo, query }: AnimeCarouselProps) {
  const { data, error, isPending, isError } = query;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{title}</h2>
        <Link
          to={viewMoreTo}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View More
          <ArrowRight className="size-4" />
        </Link>
      </div>
      {isPending && <p className="text-sm text-muted-foreground">Loading...</p>}
      {isError && (
        <p className="text-sm text-muted-foreground">
          Failed to load anime: {error.message}
        </p>
      )}
      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground">No anime found.</p>
      )}
      {data && data.length > 0 && (
        <Carousel opts={{ align: "start" }}>
          <CarouselContent>
            {data.map((media) => (
              <CarouselItem
                key={media.id}
                className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
              >
                <AnimeCard media={media} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-4" />
          <CarouselNext className="-right-4" />
        </Carousel>
      )}
    </section>
  );
}
