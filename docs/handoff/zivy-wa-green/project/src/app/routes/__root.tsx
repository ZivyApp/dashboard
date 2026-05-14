import { Outlet, createRootRoute } from "@tanstack/react-router";
import { useSessionStore } from "@/stores/session";
import { Spinner } from "@/ui/Spinner/Spinner";

export const Route = createRootRoute({
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
