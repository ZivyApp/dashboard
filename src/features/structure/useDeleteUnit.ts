import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";
import type { StructureFormError} from "./structureError";
import { toStructureError } from "./structureError";

export interface DeleteUnitInput {
  id: string;
}

/**
 * DELETE /units/{id} → 204. O Core faz SET NULL em residents.unit_id —
 * nenhuma outra query do dashboard depende disso hoje, então só units
 * é invalidada.
 */
export function useDeleteUnit(condoId: string) {
  const qc = useQueryClient();
  const m = useMutation<void, StructureFormError | Error, DeleteUnitInput>({
    mutationFn: async ({ id }) => {
      const { error, response } = await api.DELETE("/units/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw toStructureError(response.status, error, "Falha ao excluir unidade");
      }
    },
    onSuccess: () => {
      notify.success("Unidade excluída");
      void qc.invalidateQueries({ queryKey: ["units", condoId] });
    },
    onError: (_err, vars) => {
      notify.error("Não foi possível excluir a unidade", { retry: () => m.mutate(vars) });
    },
  });

  return {
    deleteUnit: (input: DeleteUnitInput, opts?: { onSuccess?: () => void }) =>
      m.mutate(input, opts),
    isPending: m.isPending,
    isError: m.isError,
  };
}
