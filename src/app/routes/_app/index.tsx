import { createFileRoute } from "@tanstack/react-router";
import { requireRoleAny } from "@/lib/routeGuards";
import { OverviewPage } from "@/features/overview/OverviewPage";

export const Route = createFileRoute("/_app/")({
  // Cross-condo: alinha com /inbox, /tickets, /approvals (manager em algum condo).
  // requireRoleAny já cobre o caso de 0 condos (sem manager → /no-access).
  beforeLoad: requireRoleAny("manager"),
  component: OverviewPage,
});
