import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface AnimeInfoCardProps {
  type?: ReactNode;
  episodes?: ReactNode;
  status?: ReactNode;
  season?: ReactNode;
  studios?: ReactNode;
  source?: ReactNode;
  score?: ReactNode;
  genres?: string[];
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export function AnimeInfoCard({
  type,
  episodes,
  status,
  season,
  studios,
  source,
  score,
  genres,
}: AnimeInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Information</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {type !== undefined && <InfoRow label="Type" value={type} />}
        {episodes !== undefined && <InfoRow label="Episodes" value={episodes} />}
        {status !== undefined && <InfoRow label="Status" value={status} />}
        {season !== undefined && <InfoRow label="Season" value={season} />}
        {studios !== undefined && <InfoRow label="Studios" value={studios} />}
        {source !== undefined && <InfoRow label="Source" value={source} />}
        {score !== undefined && <InfoRow label="Score" value={score} />}
        {genres && genres.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground uppercase">Genres</span>
            <div className="flex flex-wrap gap-1.5">
              {genres.map((genre) => (
                <span key={genre} className="rounded-md bg-muted px-2 py-0.5 text-xs">
                  {genre}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
