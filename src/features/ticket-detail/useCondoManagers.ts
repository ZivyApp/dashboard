import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Role } from "@/features/condo/roleHierarchy";

export interface CondoManager {
  userId: string;
  email: string;
  name: string;
  role: Role;
  /** Rótulo de exibição email-first: name quando houver, senão email. */
  label: string;
}

const ROLES: readonly string[] = ["viewer", "staff", "manager", "super_admin"];

function isRole(v: unknown): v is Role {
  return typeof v === "string" && ROLES.includes(v);
}

function toCondoManager(v: unknown): CondoManager | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.user_id !== "string" || !isRole(o.role)) return null;
  const email = typeof o.email === "string" ? o.email : "";
  const name = typeof o.name === "string" ? o.name : "";
  return { userId: o.user_id, email, name, role: o.role, label: name || email || o.user_id };
}

export function condoManagersQueryOptions(condoId: string) {
  return queryOptions({
    queryKey: ["condo-managers", condoId] as const,
    queryFn: async (): Promise<CondoManager[]> => {
      const { data, error } = await api.GET("/condos/{id}/managers", {
        params: { path: { id: condoId } },
      });
      if (error) {
        throw new Error(`ManagersService.list(${condoId}): falha em GET /condos/{id}/managers`, {
          cause: error,
        });
      }
      return (data ?? []).map(toCondoManager).filter((m): m is CondoManager => m !== null);
    },
    staleTime: 5 * 60_000,
  });
}

export function useCondoManagers(condoId: string) {
  return useQuery(condoManagersQueryOptions(condoId));
}
