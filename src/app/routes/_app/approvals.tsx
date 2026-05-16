import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import { requireRoleAny } from "@/lib/routeGuards";

export const Route = createFileRoute("/_app/approvals")({
  beforeLoad: requireRoleAny("manager"),
  component: () => <EmptyState title="Aprovações cross-condo" description="Em breve." />,
});
