import { createFileRoute, useRouter } from "@tanstack/react-router";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { CoverImage } from "@/components/anime/CoverImage";
import { OfflineNotice, OfflineState } from "@/components/anime/OfflineState";
import { RouteError } from "@/components/RouteError";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAnimeById } from "@/lib/anilist/hooks";
import { relatedAnime } from "@/lib/anilist/queries";
import type {
  AnimeDetailMedia,
  MediaFormat,
  MediaSeason,
} from "@/lib/anilist/types";
import {
  useDeleteAnime,
  useLibrary,
  useSaveAnime,
  useUpdateEpisodesSeen,
  useUpdateWatchStatus,
} from "@/lib/library/hooks";
import {
  WATCH_STATUSES,
  WATCH_STATUS_LABELS,
  isWatchStatus,
  type TrackedAnime,
  type WatchStatus,
} from "@/lib/library/types";

export const Route = createFileRoute("/anime/$id")({
  component: AnimeDetailPage,
  errorComponent: RouteError,
});

const FORMAT_LABELS: Record<MediaFormat, string> = {
  TV: "TV",
  TV_SHORT: "TV Short",
  MOVIE: "Movie",
  SPECIAL: "Special",
  OVA: "OVA",
  ONA: "ONA",
  MUSIC: "Music",
};

const SEASON_LABELS: Record<MediaSeason, string> = {
  WINTER: "Winter",
  SPRING: "Spring",
  SUMMER: "Summer",
  FALL: "Fall",
};

function parseAnimeId(param: string): number | null {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function humanizeEnum(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function synopsisText(description: string): string {
  return description
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function AnimeDetailPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const animeId = parseAnimeId(id);

  if (animeId === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8">
        <h1 className="text-3xl font-bold">Anime Detail</h1>
        <p className="text-muted-foreground">Invalid anime ID: {id}</p>
      </div>
    );
  }

  return (
    <>
      {router.history.canGoBack() && (
        <div className="px-8 pt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.history.back()}
          >
            <ArrowLeft /> Back
          </Button>
        </div>
      )}
      <AnimeDetail animeId={animeId} />
    </>
  );
}

function AnimeDetail({ animeId }: { animeId: number }) {
  const {
    data: detail,
    error,
    isPending,
    isError,
    refetch,
  } = useAnimeById(animeId);
  const { data: library, isPending: libraryIsPending } = useLibrary();
  const tracked =
    library?.find((anime) => anime.anilist_id === animeId) ?? null;

  if (isPending || (isError && libraryIsPending)) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Loading anime...</p>
      </div>
    );
  }
  if (isError) {
    if (tracked) {
      return <TrackedAnimeDetail tracked={tracked} onRetry={refetch} />;
    }
    return <OfflineState error={error} onRetry={refetch} />;
  }
  if (!detail) {
    return null;
  }

  const related = relatedAnime(detail);
  const title = detail.title.english ?? detail.title.romaji ?? "Unknown title";
  const seasonText =
    detail.season && detail.seasonYear
      ? `${SEASON_LABELS[detail.season]} ${detail.seasonYear}`
      : null;
  const studios = (detail.studios?.nodes ?? [])
    .map((studio) => studio.name)
    .join(", ");
  const genres = detail.genres ?? [];

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex w-full shrink-0 flex-col gap-4 md:w-60">
          <CoverImage
            src={detail.coverImage?.large}
            alt={`Cover image for ${title}`}
            className="aspect-2/3 w-full rounded-xl object-cover"
          />
          <TrackingControls
            detail={detail}
            tracked={tracked}
            libraryPending={libraryIsPending}
          />
          <div className="flex flex-col gap-3">
            <InfoRow
              label="Type"
              value={detail.format ? FORMAT_LABELS[detail.format] : "-"}
            />
            <InfoRow label="Episodes" value={detail.episodes ?? "TBA"} />
            <InfoRow
              label="Status"
              value={detail.status ? humanizeEnum(detail.status) : "-"}
            />
            <InfoRow label="Season" value={seasonText ?? "-"} />
            <InfoRow label="Studios" value={studios || "-"} />
            <InfoRow
              label="Source"
              value={detail.source ? humanizeEnum(detail.source) : "-"}
            />
            <InfoRow label="Score" value={detail.averageScore ?? "-"} />
            {genres.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Genres
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {genres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-md bg-muted px-2 py-0.5 text-xs"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold">
              {detail.title.romaji ?? title}
            </h1>
            {detail.title.english &&
              detail.title.english !== detail.title.romaji && (
                <p className="text-lg text-muted-foreground">
                  {detail.title.english}
                </p>
              )}
            {detail.title.native && (
              <p className="text-sm text-muted-foreground">
                {detail.title.native}
              </p>
            )}
          </div>
          {detail.description && (
            <section className="flex flex-col gap-2">
              <h2 className="text-lg font-bold">Synopsis</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {synopsisText(detail.description)}
              </p>
            </section>
          )}
          {related.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-bold">Related Entries</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {related.map((media) => (
                  <AnimeCard key={media.id} media={media} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function TrackedAnimeDetail({
  tracked,
  onRetry,
}: {
  tracked: TrackedAnime;
  onRetry: () => void;
}) {
  const seasonText =
    tracked.season || tracked.year
      ? [tracked.season ? humanizeEnum(tracked.season) : null, tracked.year]
          .filter(Boolean)
          .join(" ")
      : null;

  return (
    <div className="flex flex-col gap-8 p-8">
      <OfflineNotice message="Showing saved data." onRetry={onRetry} />
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex w-full shrink-0 flex-col gap-4 md:w-60">
          <CoverImage
            src={convertFileSrc(tracked.cover_image_path)}
            alt={`Cover image for ${tracked.title}`}
            className="aspect-2/3 w-full rounded-xl object-cover"
          />
          <TrackingControls
            detail={null}
            tracked={tracked}
            libraryPending={false}
          />
          <div className="flex flex-col gap-3">
            <InfoRow
              label="Type"
              value={
                tracked.format
                  ? (FORMAT_LABELS[tracked.format as MediaFormat] ??
                    tracked.format)
                  : "-"
              }
            />
            <InfoRow label="Episodes" value={tracked.episode_count ?? "TBA"} />
            <InfoRow label="Season" value={seasonText ?? "-"} />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-3xl font-bold">{tracked.title}</h1>
        </div>
      </div>
    </div>
  );
}

function TrackingControls({
  detail,
  tracked,
  libraryPending,
}: {
  detail: AnimeDetailMedia | null;
  tracked: TrackedAnime | null;
  libraryPending: boolean;
}) {
  const saveAnimeMutation = useSaveAnime();
  const updateWatchStatusMutation = useUpdateWatchStatus();
  const updateEpisodesSeenMutation = useUpdateEpisodesSeen();
  const deleteAnimeMutation = useDeleteAnime();

  const mutationError =
    saveAnimeMutation.error ??
    updateWatchStatusMutation.error ??
    updateEpisodesSeenMutation.error ??
    deleteAnimeMutation.error;

  const cover = detail?.coverImage?.large ?? "";
  const title =
    detail?.title.english ?? detail?.title.romaji ?? "Unknown title";

  function handleSave(status: WatchStatus) {
    if (!detail) {
      return;
    }
    saveAnimeMutation.mutate({
      anilistId: detail.id,
      title,
      coverImageUrl: cover,
      episodeCount: detail.episodes,
      season: detail.season,
      year: detail.seasonYear,
      format: detail.format,
      status,
      episodesSeen: 0,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {tracked === null ? (
        detail ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={!cover || libraryPending}>
                Add to Library
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {WATCH_STATUSES.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleSave(status)}
                >
                  {WATCH_STATUS_LABELS[status]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Watch Status
            </span>
            <Select
              value={tracked.status}
              aria-label="Watch status"
              onValueChange={(value) => {
                if (isWatchStatus(value)) {
                  updateWatchStatusMutation.mutate({
                    anilistId: tracked.anilist_id,
                    status: value,
                  });
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WATCH_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {WATCH_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Episodes Seen
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Decrease episodes seen"
                disabled={
                  tracked.episodes_seen <= 0 ||
                  updateEpisodesSeenMutation.isPending
                }
                onClick={() =>
                  updateEpisodesSeenMutation.mutate({
                    anilistId: tracked.anilist_id,
                    episodesSeen: tracked.episodes_seen - 1,
                  })
                }
              >
                <Minus />
              </Button>
              <span className="min-w-16 text-center text-sm">
                {tracked.episodes_seen}
                {tracked.episode_count !== null
                  ? ` / ${tracked.episode_count}`
                  : ""}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Increase episodes seen"
                disabled={
                  (tracked.episode_count !== null &&
                    tracked.episodes_seen >= tracked.episode_count) ||
                  updateEpisodesSeenMutation.isPending
                }
                onClick={() =>
                  updateEpisodesSeenMutation.mutate({
                    anilistId: tracked.anilist_id,
                    episodesSeen: tracked.episodes_seen + 1,
                  })
                }
              >
                <Plus />
              </Button>
            </div>
          </div>
          <Button
            variant="destructive"
            disabled={deleteAnimeMutation.isPending}
            onClick={() => deleteAnimeMutation.mutate(tracked.anilist_id)}
          >
            Remove from Library
          </Button>
        </>
      )}
      {mutationError && (
        <p className="text-sm text-destructive">{mutationError.message}</p>
      )}
    </div>
  );
}
