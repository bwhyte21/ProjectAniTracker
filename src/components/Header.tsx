import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveTheme, toggleTheme, type Theme } from "@/lib/theme";

export function Header() {
  const [theme, setTheme] = useState<Theme>(getActiveTheme());

  return (
    <header className="flex justify-end p-4">
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
