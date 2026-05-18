import { useMyCondos } from "@/features/condo/useMyCondos";
import { isAtLeast } from "@/features/condo/roleHierarchy";
import type { Scope } from "@/features/scope/useScope";

export function useCanApprove(scope: Scope): boolean {
  const { data } = useMyCondos();
  if (!data) return false;
  if (scope.kind === "condo") {
    const c = data.find((d) => d.condoId === scope.condoId);
    return c !== undefined && isAtLeast(c.role, "manager");
  }
  return data.some((d) => isAtLeast(d.role, "manager"));
}
