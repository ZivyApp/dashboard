import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { toCondoMembership, type CondoMembership } from "./condoMembership";

export { toCondoMembership };
export type { CondoMembership };

export function myCondosQueryOptions() {
  return queryOptions({
    queryKey: ["condos", "me"] as const,
    queryFn: async (): Promise<CondoMembership[]> => {
      const { data, error } = await api.GET("/condos/me");
      if (error) throw new Error("GET /condos/me failed", { cause: error });
      return (data ?? []).map(toCondoMembership).filter((c): c is CondoMembership => c !== null);
    },
    staleTime: 5 * 60_000,
  });
}

export function useMyCondos() {
  return useQuery(myCondosQueryOptions());
}
