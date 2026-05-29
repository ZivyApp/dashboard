import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Modal } from "@/ui/Modal/Modal";
import { TicketDetailPage } from "@/features/ticket-detail/TicketDetailPage";

export const Route = createFileRoute("/_app/c/$condoId/tickets/$ticketId")({
  component: TicketDetailRoute,
});

function TicketDetailRoute() {
  const { condoId, ticketId } = Route.useParams();
  const navigate = useNavigate();
  const close = () => {
    void navigate({ to: "/c/$condoId/tickets", params: { condoId } });
  };
  return (
    <Modal open size="lg" title="Detalhe do chamado" onClose={close}>
      <TicketDetailPage condoId={condoId} ticketId={ticketId} onClose={close} />
    </Modal>
  );
}
