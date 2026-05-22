import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ResidentActionInput } from "./useApproveResident";

export function useRejectResident() {
  const qc = useQueryClient();
  const m = useMutation<void, Error, ResidentActionInput>({
    mutationFn: async ({ id, condoId }) => {
      const { error } = await api.PATCH("/residents/{id}/reject", {
        params: { path: { id } },
        headers: { "X-Condo-ID": condoId },
      });
      if (error) {
        throw new Error("ApprovalsService.reject: falha em PATCH /residents/{id}/reject", {
          cause: error,
        });
      }
    },
    onSuccess: (_data, { condoId }) => qc.invalidateQueries({ queryKey: ["residents", condoId] }),
  });

  return {
    reject: (input: ResidentActionInput, opts?: { onSuccess?: () => void }) =>
      m.mutate(input, opts),
    isPending: m.isPending,
    isError: m.isError,
  };
}
