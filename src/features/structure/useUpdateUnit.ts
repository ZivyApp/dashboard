import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";
import { toUnit, type Unit } from "./unit";
import { StructureFormError, toStructureError } from "./structureError";

export interface UpdateUnitInput {
  id: string;
  number: string;
  /** Omitido = não altera. Core não aceita null — floor setado não pode ser limpo. */
  floor?: number;
}

/**
 * PATCH /units/{id}. O Core não permite trocar a unidade de bloco
 * (UpdateUnitRequest não tem block_id) — por isso o select de bloco
 * não aparece no modo de edição do UnitFormModal.
 */
export function useUpdateUnit(condoId: string) {
  const qc = useQueryClient();
  const m = useMutation<Unit, StructureFormError | Error, UpdateUnitInput>({
    mutationFn: async (input) => {
      const { data, error, response } = await api.PATCH("/units/{id}", {
        params: { path: { id: input.id } },
        body: {
          number: input.number,
          ...(input.floor !== undefined ? { floor: input.floor } : {}),
        },
      });
      if (error || !data) {
        throw toStructureError(response.status, error, "Falha ao atualizar unidade");
      }
      const unit = toUnit(data);
      if (!unit) {
        throw new Error("StructureService.updateUnit: payload incompleto em PATCH /units/{id}");
      }
      return unit;
    },
    onSuccess: () => {
      notify.success("Unidade atualizada");
      void qc.invalidateQueries({ queryKey: ["units", condoId] });
    },
    onError: (err, vars) => {
      if (err instanceof StructureFormError && err.status === 400) return;
      notify.error("Não foi possível atualizar a unidade", { retry: () => m.mutate(vars) });
    },
  });

  return {
    updateUnit: (input: UpdateUnitInput, opts?: { onSuccess?: () => void }) =>
      m.mutate(input, opts),
    isPending: m.isPending,
    formError:
      m.error instanceof StructureFormError && m.error.status === 400 ? m.error.message : null,
    isError: m.isError,
  };
}
