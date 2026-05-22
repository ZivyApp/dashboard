import { createFileRoute, redirect } from "@tanstack/react-router";
import { myCondosQueryOptions } from "@/features/condo/useMyCondos";
import { isAtLeast } from "@/features/condo/roleHierarchy";
import { OverviewPage } from "@/features/overview/OverviewPage";

export const Route = createFileRoute("/_app/")({
  beforeLoad: async ({ context }) => {
    const condos = await context.queryClient.ensureQueryData(myCondosQueryOptions());

    if (condos.length === 0) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/no-access" });
    }

    // 1 condo (qualquer role) → entra direto na visão geral do condo, com o
    // switcher já preenchido. Evita o "Selecione condomínio" e não bloqueia
    // staff/viewer (que não passariam no gate de manager do cross-condo).
    const first = condos[0];
    if (condos.length === 1 && first) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/c/$condoId", params: { condoId: first.condoId } });
    }

    // >1 condos: o overview cross-condo é privilégio de quem administra (manager
    // em algum condo). Sem manager → cai na visão geral do primeiro condo.
    const hasManager = condos.some((c) => isAtLeast(c.role, "manager"));
    if (!hasManager && first) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/c/$condoId", params: { condoId: first.condoId } });
    }
  },
  component: OverviewPage,
});
