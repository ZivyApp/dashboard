import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/_app/c/$condoId/approvals")({
  component: () => (
    <EmptyState title="Aprovações" description="Em breve. Esta tela será implementada no Plan 6." />
  ),
});
