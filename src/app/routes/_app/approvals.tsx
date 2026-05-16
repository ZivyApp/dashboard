import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/_app/approvals")({
  component: () => <EmptyState title="Aprovações cross-condo" description="Em breve." />,
});
