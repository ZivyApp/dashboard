import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ResidentActionInput } from "./pendingResident";

export function useApproveResident() {
  const qc = useQueryClient();
  const m = useMutation<void, Error, ResidentActionInput>({
    mutationFn: async ({ id, condoId }) => {
      const { error } = await api.PATCH("/residents/{id}/approve", {
        params: { path: { id } },
        headers: { "X-Condo-ID": condoId },
      });
      if (error) {
        throw new Error("ApprovalsService.approve: falha em PATCH /residents/{id}/approve", {
          cause: error,
        });
      }
    },
    onSuccess: (_data, { condoId }) => qc.invalidateQueries({ queryKey: ["residents", condoId] }),
  });

  return {
    approve: (input: ResidentActionInput, opts?: { onSuccess?: () => void }) =>
      m.mutate(input, opts),
    // id em voo (não um booleano global) para o card alvo desabilitar sozinho —
    // o gestor segue agindo nos demais durante uma aprovação.
    pendingId: m.isPending ? m.variables?.id : undefined,
    isError: m.isError,
  };
}
