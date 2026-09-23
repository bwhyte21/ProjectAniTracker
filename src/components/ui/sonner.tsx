import type { CSSProperties } from "react";
import { Toaster as Sonner } from "sonner";
import { getActiveTheme } from "@/lib/theme";

// Sonner's built-in palettes are hardcoded grays; point them at the theme
// tokens (ADR-0010) so toasts follow the active theme with no hardcoded
// colors. The vars resolve against :root/[data-theme="light"] like the rest
// of the app.
const toastTokens = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
} as CSSProperties;

export function Toaster() {
  return <Sonner theme={getActiveTheme()} style={toastTokens} />;
}
