import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireAuth } from "@/lib/routeGuards";

export const Route = createFileRoute("/")({
  beforeLoad: (ctx) => {
    requireAuth(ctx);
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to: "/inbox" });
  },
});
