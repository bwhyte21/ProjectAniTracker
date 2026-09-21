import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Heart } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

interface BuildInfo {
  version: string;
  git_commit: string;
  platform: string;
}

function AboutPage() {
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);

  useEffect(() => {
    invoke<BuildInfo>("get_build_info").then(setBuildInfo);
  }, []);

  const rows = buildInfo
    ? [
        { label: "Version", value: buildInfo.version },
        { label: "Git Commit", value: buildInfo.git_commit },
        { label: "Platform", value: buildInfo.platform },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6 p-8">
      <h1 className="text-3xl font-bold">About</h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>AniTracker</CardTitle>
          <CardDescription>
            Local anime tracker powered by Tauri and AniList.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {buildInfo ? (
            <div className="flex flex-col gap-2">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-sm text-muted-foreground">
                    {row.label}
                  </span>
                  <span className="text-sm font-medium break-all">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Loading build info...
            </p>
          )}
        </CardContent>
      </Card>
      <p className="max-w-md text-sm text-muted-foreground">
        Built with{" "}
        <Heart
          className="inline-block size-4 animate-heartbeat text-destructive"
          fill="currentColor"
          aria-hidden="true"
        />{" "}
        using Rust & TypeScript
      </p>
    </div>
  );
}
