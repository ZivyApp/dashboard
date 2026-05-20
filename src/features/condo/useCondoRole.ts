import { useMyCondos } from "./useMyCondos";
import type { Role } from "./roleHierarchy";

/**
 * Resolve a role do usuário num condo específico. Retorna `undefined`
 * enquanto `useMyCondos` carrega, quando `condoId` é `undefined`, ou quando
 * o usuário não é membro do condo. Centraliza o `find` de role usado por
 * `useRoleGuard` e por telas que decidem visibilidade de ações por role.
 */
export function useCondoRole(condoId: string | undefined): Role | undefined {
  const { data } = useMyCondos();
  if (condoId === undefined) return undefined;
  return data?.find((c) => c.condoId === condoId)?.role;
}
