import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/routeGuards";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/_app/c/$condoId/tickets/new")({
  beforeLoad: requireRole("staff"),
  component: () => (
    <EmptyState
      title="Novo chamado"
      description="Form completo (POST /tickets) chega na Slice 6.2.1."
    />
  ),
});
