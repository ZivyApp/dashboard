import { useParams } from "@tanstack/react-router";
import { useCondoRole } from "./useCondoRole";
import { isAtLeast } from "./roleHierarchy";
import type { Role } from "./roleHierarchy";

export function useRoleGuard(min: Role): { allowed: boolean } {
  const params = useParams({ strict: false });
  const role = useCondoRole(params.condoId);
  return { allowed: !!role && isAtLeast(role, min) };
}
