import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Moon, Settings, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { getMatureContent, setMatureContent } from "@/lib/mature-content";
import { getActiveTheme, toggleTheme, type Theme } from "@/lib/theme";

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
  const queryClient = useQueryClient();

  const handleMatureContentChange = (enabled: boolean) => {
    setMatureContent(enabled);
    setMatureContentState(enabled);
    queryClient.invalidateQueries({ queryKey: ["anilist"] });
  };

  return (
    <header className="flex items-center justify-between p-4">
      <div className="flex items-center gap-6">
        <Link
          to="/"
          className="text-lg font-bold"
          activeProps={{ className: "text-foreground" }}
        >
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
    </header>
  );
}
