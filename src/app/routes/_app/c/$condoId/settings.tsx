import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/_app/c/$condoId/settings")({
  component: () => (
    <EmptyState title="Configurações" description="Será implementada em um plano futuro." />
  ),
});
