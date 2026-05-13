import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import { requireRole } from "@/lib/routeGuards";

export const Route = createFileRoute("/_app/c/$condoId/approvals")({
  beforeLoad: requireRole("manager"),
  component: () => (
    <EmptyState title="Aprovações" description="Em breve. Esta tela será implementada no Plan 6." />
  ),
});
