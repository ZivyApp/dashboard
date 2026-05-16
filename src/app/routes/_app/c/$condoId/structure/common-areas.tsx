import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/_app/c/$condoId/structure/common-areas")({
  component: () => (
    <EmptyState title="Áreas comuns" description="Será implementada em um plano futuro." />
  ),
});
