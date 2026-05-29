import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/c/$condoId/inbox/$ticketId")({
  beforeLoad: ({ params }) => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({
      to: "/c/$condoId/tickets/$ticketId",
      params: { condoId: params.condoId, ticketId: params.ticketId },
      replace: true,
    });
  },
});
