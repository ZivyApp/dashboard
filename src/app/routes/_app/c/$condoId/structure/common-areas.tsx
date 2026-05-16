import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import { requireRole } from "@/lib/routeGuards";

export const Route = createFileRoute("/_app/c/$condoId/structure/common-areas")({
  beforeLoad: requireRole("manager"),
  component: () => (
    <EmptyState title="Áreas comuns" description="Será implementada em um plano futuro." />
  ),
});
