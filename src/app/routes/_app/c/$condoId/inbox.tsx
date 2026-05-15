import { createFileRoute, Outlet } from "@tanstack/react-router";
import { InboxPage } from "@/features/inbox/InboxPage";

export const Route = createFileRoute("/_app/c/$condoId/inbox")({
  component: InboxRoute,
});

function InboxRoute() {
  const { condoId } = Route.useParams();
  return (
    <>
      <InboxPage condoId={condoId} />
      <Outlet />
    </>
  );
}
