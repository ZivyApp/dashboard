import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TicketDetailPage } from "@/features/ticket-detail/TicketDetailPage";

export const Route = createFileRoute("/_app/c/$condoId/tickets/$ticketId")({
  component: TicketDetailRoute,
});

function TicketDetailRoute() {
  const { condoId, ticketId } = Route.useParams();
  const navigate = useNavigate();
  return (
    <TicketDetailPage
      condoId={condoId}
      ticketId={ticketId}
      onClose={() => {
        void navigate({ to: "/c/$condoId/tickets", params: { condoId } });
      }}
    />
  );
}
