import { createFileRoute } from "@tanstack/react-router";
import { requireRoleAny } from "@/lib/routeGuards";
import { ApprovalsPage } from "@/features/approvals/ApprovalsPage";

export const Route = createFileRoute("/_app/approvals")({
  beforeLoad: requireRoleAny("manager"),
  component: ApprovalsPage,
});
