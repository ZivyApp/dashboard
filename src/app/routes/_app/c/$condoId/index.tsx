import { createFileRoute } from "@tanstack/react-router";
import { CondoOverviewPage } from "@/features/overview/CondoOverviewPage";

export const Route = createFileRoute("/_app/c/$condoId/")({
  component: CondoOverviewRoute,
});

function CondoOverviewRoute() {
  const { condoId } = Route.useParams();
  return <CondoOverviewPage condoId={condoId} />;
}
