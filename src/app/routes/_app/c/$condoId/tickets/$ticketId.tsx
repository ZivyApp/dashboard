import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/_app/c/$condoId/tickets/$ticketId")({
  component: () => (
    <EmptyState title="Detalhe do chamado" description="Tela completa chega na Slice 6.5." />
  ),
});
