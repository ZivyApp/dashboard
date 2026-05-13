import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/routeGuards";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/no-access")({
  beforeLoad: requireAuth,
  component: NoAccessPage,
});

function NoAccessPage() {
  return (
    <EmptyState
      title="Sem acesso"
      description="Sua conta não está vinculada a nenhum condomínio. Fale com o suporte."
    />
  );
}
