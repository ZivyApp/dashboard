import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/_app/tickets")({
  component: () => (
    <EmptyState title="Tickets" description="Em breve. Esta tela será implementada no Plan 5." />
  ),
});
