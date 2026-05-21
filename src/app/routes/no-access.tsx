import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "@/lib/routeGuards";
import { useMyCondos } from "@/features/condo/useMyCondos";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/no-access")({
  beforeLoad: requireAuth,
  component: NoAccessPage,
});

function NoAccessPage() {
  const { data: condos, isPending } = useMyCondos();
  // Distingue "sem nenhum condo" de "tem condo mas sem permissão para a área"
  // (ex.: viewer caindo aqui via requireRoleAny("manager")).
  const hasCondos = (condos?.length ?? 0) > 0;
  const description = isPending
    ? "Verificando seu acesso…"
    : hasCondos
      ? "Você não tem permissão para acessar esta área. Fale com o síndico do seu condomínio."
      : "Sua conta não está vinculada a nenhum condomínio. Fale com o suporte.";

  return <EmptyState title="Sem acesso" description={description} />;
}
