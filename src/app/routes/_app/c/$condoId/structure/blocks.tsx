import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/routeGuards";
import { BlocksPage } from "@/features/structure/BlocksPage";

export const Route = createFileRoute("/_app/c/$condoId/structure/blocks")({
  beforeLoad: requireRole("manager"),
  component: function BlocksRoute() {
    const { condoId } = Route.useParams();
    return <BlocksPage condoId={condoId} />;
  },
});
