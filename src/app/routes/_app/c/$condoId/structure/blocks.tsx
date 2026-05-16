import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import { requireRole } from "@/lib/routeGuards";

export const Route = createFileRoute("/_app/c/$condoId/structure/blocks")({
  beforeLoad: requireRole("manager"),
  component: () => (
    <EmptyState title="Blocos" description="Será implementada em um plano futuro." />
  ),
});
