import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";
import { toUnit, type Unit } from "./unit";
import { StructureFormError, toStructureError } from "./structureError";

export interface CreateUnitInput {
  blockId: string;
  number: string;
  floor?: number;
}

export function useCreateUnit(condoId: string) {
  const qc = useQueryClient();
  const m = useMutation<Unit, StructureFormError | Error, CreateUnitInput>({
    mutationFn: async (input) => {
      const { data, error, response } = await api.POST("/units", {
        body: {
          block_id: input.blockId,
          number: input.number,
          ...(input.floor !== undefined ? { floor: input.floor } : {}),
        },
      });
      if (error || !data) {
        throw toStructureError(response.status, error, "Falha ao criar unidade");
      }
      const unit = toUnit(data);
      if (!unit) {
        throw new Error("StructureService.createUnit: payload incompleto em POST /units");
      }
      return unit;
    },
    onSuccess: () => {
      notify.success("Unidade criada");
      void qc.invalidateQueries({ queryKey: ["units", condoId] });
    },
    onError: (err, vars) => {
      if (err instanceof StructureFormError && err.status === 400) return;
      notify.error("Não foi possível criar a unidade", { retry: () => m.mutate(vars) });
    },
  });

  return {
    createUnit: (input: CreateUnitInput, opts?: { onSuccess?: () => void }) =>
      m.mutate(input, opts),
    isPending: m.isPending,
    formError: m.error instanceof StructureFormError ? m.error.message : null,
    isError: m.isError,
  };
}
