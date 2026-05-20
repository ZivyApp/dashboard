import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { requireRole } from "@/lib/routeGuards";
import { TicketCreateModal } from "@/features/tickets/TicketCreateModal";

export const Route = createFileRoute("/_app/c/$condoId/tickets/new")({
  beforeLoad: requireRole("staff"),
  component: NewTicketRoute,
});

function NewTicketRoute() {
  const { condoId } = Route.useParams();
  const navigate = useNavigate();
  return (
    <TicketCreateModal
      condoId={condoId}
      onClose={() => {
        void navigate({ to: "/c/$condoId/tickets", params: { condoId } });
      }}
    />
  );
}
