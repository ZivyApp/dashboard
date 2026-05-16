import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/_app/inbox")({
  component: () => (
    <EmptyState
      title="Inbox cross-condo"
      description="Será implementada no Slice 5.2 (Activity Feed)."
    />
  ),
});
