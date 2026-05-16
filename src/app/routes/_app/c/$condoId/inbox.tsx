import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ActivityFeed } from "@/features/activity/ActivityFeed";

export const Route = createFileRoute("/_app/c/$condoId/inbox")({
  validateSearch: (search: Record<string, unknown>): { tab?: "all" | "unread" | "approvals" } => {
    if (search.tab === "unread" || search.tab === "approvals" || search.tab === "all") {
      return { tab: search.tab };
    }
    return {};
  },
  component: InboxRoute,
});

function InboxRoute() {
  const { condoId } = Route.useParams();
  return (
    <>
      <ActivityFeed scope={{ kind: "condo", condoId }} />
      <Outlet />
    </>
  );
}
