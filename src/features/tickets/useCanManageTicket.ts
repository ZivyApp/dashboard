import { useMyCondos } from "@/features/condo/useMyCondos";
import { isAtLeast } from "@/features/condo/roleHierarchy";

/** Permite ações de escrita no ticket (status/assumir/comentar) quando o usuário é staff+ no condo. */
export function useCanManageTicket(condoId: string): boolean {
  const { data } = useMyCondos();
  if (!data) return false;
  const membership = data.find((c) => c.condoId === condoId);
  return membership !== undefined && isAtLeast(membership.role, "staff");
}
