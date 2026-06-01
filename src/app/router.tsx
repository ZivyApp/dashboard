import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "./queryClient";
import { RouteError } from "@/ui/AppShell/RouteError";

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  context: { queryClient },
  defaultErrorComponent: RouteError,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
