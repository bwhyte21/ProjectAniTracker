import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Moon, Settings, Sun } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { getMatureContent, setMatureContent } from "@/lib/mature-content";
import { getActiveTheme, toggleTheme, type Theme } from "@/lib/theme";
import { getDbLocation, pickDbDirectory, setDbLocation } from "@/lib/db-location";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/search", label: "Search" },
  { to: "/library", label: "Library" },
  { to: "/season", label: "Season" },
  { to: "/trending", label: "Trending" },
  { to: "/top", label: "Top" },
  { to: "/about", label: "About" },
] as const;

export function Header() {
  const [theme, setTheme] = useState<Theme>(getActiveTheme());
  const [matureContent, setMatureContentState] = useState(getMatureContent());
  const [pendingDir, setPendingDir] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: dbLocation } = useQuery({
    queryKey: ["db_location"],
    queryFn: getDbLocation,
  });

  // A chosen location that failed to open at boot runs the app from the
  // default for the session; the pointer stays for the next launch
  // (ADR-0012), so say so once per boot.
  useEffect(() => {
    if (dbLocation?.fell_back) {
      toast.warning(`couldn't open the database at ${dbLocation.path}, using the default location`);
    }
  }, [dbLocation]);

  // Resolves only for the same-directory no-op; a real move restarts
  // the app before the promise resolves.
  const moveDbMutation = useMutation({
    mutationFn: setDbLocation,
    onSuccess: () => {
      setPendingDir(null);
      toast.info("already using this location");
    },
  });

  const handleMatureContentChange = (enabled: boolean) => {
    setMatureContent(enabled);
    setMatureContentState(enabled);
    queryClient.invalidateQueries({ queryKey: ["anilist"] });
  };

  const handleChangeLocation = async () => {
    const dir = await pickDbDirectory();
    if (dir) {
      setPendingDir(dir);
    }
  };

  const handleResetLocation = () => {
    moveDbMutation.mutate();
  };

  return (
    <header className="flex items-center justify-between p-4">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-lg font-bold" activeProps={{ className: "text-foreground" }}>
          AniTracker
        </Link>
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              activeProps={{
                className: "bg-muted text-foreground",
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="flex items-center justify-between gap-4 px-2 py-1.5">
              <span className="text-sm">Mature content</span>
              <Switch
                checked={matureContent}
                onCheckedChange={handleMatureContentChange}
                aria-label="Toggle mature content"
              />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Database location</DropdownMenuLabel>
            <div className="px-2 py-1.5">
              <p
                className="truncate text-xs text-muted-foreground"
                title={dbLocation?.path}
                data-testid="db-location-path"
              >
                {dbLocation?.path ?? "Resolving..."}
              </p>
            </div>
            <DropdownMenuItem onClick={handleChangeLocation}>Change...</DropdownMenuItem>
            {dbLocation && !dbLocation.is_default && (
              <DropdownMenuItem onClick={handleResetLocation}>Reset to default</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(toggleTheme())}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
      </div>
      <AlertDialog
        open={pendingDir !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDir(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move database and restart now?</AlertDialogTitle>
            <AlertDialogDescription>
              The database will be copied to {pendingDir} and AniTracker will restart. If that
              directory already contains an anitracker.db, it will be kept as anitracker.db.bak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => moveDbMutation.mutate(pendingDir ?? undefined)}>
              Move and restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
