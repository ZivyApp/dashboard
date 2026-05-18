import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TicketsPage } from "@/features/tickets/TicketsPage";
import { requireRole } from "@/lib/routeGuards";

export const Route = createFileRoute("/_app/c/$condoId/tickets")({
  beforeLoad: requireRole("viewer"),
  component: TicketsRoute,
});

function TicketsRoute() {
  const { condoId } = Route.useParams();
  return (
    <>
      <TicketsPage condoId={condoId} />
      <Outlet />
    </>
  );
}
