import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useMyCondos, type CondoMembership } from "@/features/condo/useMyCondos";
import { isAtLeast } from "@/features/condo/roleHierarchy";
import type { Scope } from "@/features/scope/useScope";
import { toPendingResident, type PendingResident } from "./pendingResident";

async function fetchPending(condo: CondoMembership): Promise<PendingResident[]> {
  const { data, error } = await api.GET("/residents", {
    headers: { "X-Condo-ID": condo.condoId },
  });
  if (error) {
    throw new Error("ApprovalsService.fetchPending: falha em GET /residents", { cause: error });
  }
  return (data ?? [])
    .map((r) => toPendingResident(r, condo.condoName, condo.condoId))
    .filter((r): r is PendingResident => r !== null);
}

export interface PendingResidentsResult {
  residents: PendingResident[];
  isPending: boolean;
  isError: boolean;
}

export function usePendingResidents(scope: Scope): PendingResidentsResult {
  const { data: condos } = useMyCondos();
  const all = condos ?? [];

  // Em ambos os scopes só consultamos condos onde o usuário é manager+: `GET
  // /residents` retorna 403 abaixo disso. No per-condo o `beforeLoad` já barra,
  // mas filtrar aqui também é defesa em profundidade e mantém os dois ramos simétricos.
  const targets =
    scope.kind === "condo"
      ? all.filter((c) => c.condoId === scope.condoId && isAtLeast(c.role, "manager"))
      : all.filter((c) => isAtLeast(c.role, "manager"));

  const results = useQueries({
    queries: targets.map((condo) => ({
      queryKey: ["residents", condo.condoId] as const,
      queryFn: () => fetchPending(condo),
      staleTime: 10_000,
    })),
  });

  const residents = results.flatMap((r) => r.data ?? []);

  return {
    residents,
    isPending: condos === undefined || results.some((r) => r.isPending),
    isError: results.some((r) => r.isError),
  };
}
