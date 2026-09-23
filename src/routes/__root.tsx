import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main>
          <Outlet />
        </main>
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
