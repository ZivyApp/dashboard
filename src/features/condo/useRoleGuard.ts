import { useParams } from "@tanstack/react-router";
import { useMyCondos } from "./useMyCondos";
import { isAtLeast } from "./roleHierarchy";
import type { Role } from "./roleHierarchy";

export function useRoleGuard(min: Role): { allowed: boolean } {
  const params = useParams({ strict: false });
  const { data } = useMyCondos();
  const role = data?.find((c) => c.condoId === params.condoId)?.role;
  return { allowed: !!role && isAtLeast(role, min) };
}
