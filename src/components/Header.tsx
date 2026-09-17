import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveTheme, toggleTheme, type Theme } from "@/lib/theme";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/search", label: "Search" },
  { to: "/library", label: "Library" },
  { to: "/season", label: "Season" },
  { to: "/trending", label: "Trending" },
  { to: "/top", label: "Top" },
] as const;

export function Header() {
  const [theme, setTheme] = useState<Theme>(getActiveTheme());

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
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        onClick={() => setTheme(toggleTheme())}
      >
        {theme === "dark" ? <Sun /> : <Moon />}
      </Button>
    </header>
  );
}
