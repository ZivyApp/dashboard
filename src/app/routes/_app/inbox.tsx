import { createFileRoute } from "@tanstack/react-router";
import { ActivityFeed } from "@/features/activity/ActivityFeed";
import { requireRoleAny } from "@/lib/routeGuards";

export const Route = createFileRoute("/_app/inbox")({
  beforeLoad: requireRoleAny("manager"),
  validateSearch: (search: Record<string, unknown>): { tab?: "all" | "unread" | "approvals" } => {
    if (search.tab === "unread" || search.tab === "approvals" || search.tab === "all") {
      return { tab: search.tab };
    }
    return {};
  },
  component: () => <ActivityFeed scope={{ kind: "all" }} />,
});
