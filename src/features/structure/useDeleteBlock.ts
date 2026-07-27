import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";
import type { StructureFormError } from "./structureError";
import { toStructureError } from "./structureError";

export interface DeleteBlockInput {
  id: string;
}

/**
 * DELETE /blocks/{id} → 204. O Core remove em CASCADE as unidades do bloco,
 * por isso invalida blocks E units do condo.
 */
export function useDeleteBlock(condoId: string) {
  const qc = useQueryClient();
  const m = useMutation<void, StructureFormError | Error, DeleteBlockInput>({
    mutationFn: async ({ id }) => {
      const { error, response } = await api.DELETE("/blocks/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw toStructureError(response.status, error, "Falha ao excluir bloco");
      }
    },
    onSuccess: () => {
      notify.success("Bloco excluído");
      void qc.invalidateQueries({ queryKey: ["blocks", condoId] });
      void qc.invalidateQueries({ queryKey: ["units", condoId] });
    },
    onError: (_err, vars) => {
      // Delete não tem form visível — sempre toast, inclusive em 400.
      notify.error("Não foi possível excluir o bloco", { retry: () => m.mutate(vars) });
    },
  });

  return {
    deleteBlock: (input: DeleteBlockInput, opts?: { onSuccess?: () => void }) =>
      m.mutate(input, opts),
    isPending: m.isPending,
    isError: m.isError,
  };
}
