import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/routeGuards";
import { ApprovalsPage } from "@/features/approvals/ApprovalsPage";

export const Route = createFileRoute("/_app/c/$condoId/approvals")({
  beforeLoad: requireRole("manager"),
  component: ApprovalsPage,
});
