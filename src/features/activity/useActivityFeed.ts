import { useQuery } from "@tanstack/react-query";
import { useActivityRepository } from "./useActivityRepository";
import type { ActivityListInput, ActivityListResult } from "./repository/types";

export function useActivityFeed(input: ActivityListInput) {
  const repo = useActivityRepository();
  const scopeKey = input.scope?.kind === "condo" ? input.scope.condoId : "all";
  return useQuery<ActivityListResult>({
    queryKey: ["activity", scopeKey, input.tab ?? "all"],
    queryFn: () => repo.list(input),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}
