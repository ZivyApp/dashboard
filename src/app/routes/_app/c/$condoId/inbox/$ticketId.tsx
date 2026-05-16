import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TicketDetailModal } from "@/features/inbox/TicketDetailModal";

export const Route = createFileRoute("/_app/c/$condoId/inbox/$ticketId")({
  component: TicketDetailRoute,
});

function TicketDetailRoute() {
  const { condoId, ticketId } = Route.useParams();
  const navigate = useNavigate();

  const handleClose = () => {
    void navigate({
      to: "/c/$condoId/inbox",
      params: { condoId },
    });
  };

  return <TicketDetailModal ticketId={ticketId} onClose={handleClose} />;
}
