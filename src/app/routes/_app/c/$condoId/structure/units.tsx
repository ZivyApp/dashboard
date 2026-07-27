import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/routeGuards";
import { UnitsPage } from "@/features/structure/UnitsPage";

export const Route = createFileRoute("/_app/c/$condoId/structure/units")({
  beforeLoad: requireRole("manager"),
  component: function UnitsRoute() {
    const { condoId } = Route.useParams();
    return <UnitsPage condoId={condoId} />;
  },
});
