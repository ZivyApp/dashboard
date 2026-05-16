import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/_app/c/$condoId/structure/blocks")({
  component: () => (
    <EmptyState title="Blocos" description="Será implementada em um plano futuro." />
  ),
});
