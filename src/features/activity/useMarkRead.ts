import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useActivityRepository } from "./useActivityRepository";
import type { Scope } from "@/features/scope/useScope";

type Input = { type: "one"; id: string } | { type: "all"; scope?: Scope };

export function useMarkRead() {
  const repo = useActivityRepository();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (input: Input) => {
      if (input.type === "one") return repo.markRead(input.id);
      return repo.markAllRead(input.scope);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activity"] }),
  });
  return {
    markRead: (id: string) => m.mutateAsync({ type: "one", id }),
    markAllRead: (scope?: Scope) => m.mutateAsync(scope ? { type: "all", scope } : { type: "all" }),
    isPending: m.isPending,
  };
}
