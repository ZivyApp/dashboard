import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/ui/AppShell/AppShell";
import { requireAuth } from "@/lib/routeGuards";

export const Route = createFileRoute("/_app")({
  beforeLoad: requireAuth,
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
