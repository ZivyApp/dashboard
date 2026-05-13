import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { useSessionStore } from "@/stores/session";
import { Spinner } from "@/ui/Spinner/Spinner";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  const status = useSessionStore((s) => s.status);
  if (status === "loading") return <Spinner fullPage />;
  return (
    <div style={{ minHeight: "100%" }}>
      <Outlet />
    </div>
  );
}
