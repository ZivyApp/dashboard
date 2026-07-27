import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";
import { toBlock, type Block } from "./block";
import { StructureFormError, toStructureError } from "./structureError";

export interface UpdateBlockInput {
  id: string;
  name: string;
  /** Enviada sempre (inclusive "") — PATCH parcial permite limpar a descrição. */
  description: string;
}

export function useUpdateBlock(condoId: string) {
  const qc = useQueryClient();
  const m = useMutation<Block, StructureFormError | Error, UpdateBlockInput>({
    mutationFn: async (input) => {
      const { data, error, response } = await api.PATCH("/blocks/{id}", {
        params: { path: { id: input.id } },
        body: { name: input.name, description: input.description },
      });
      if (error || !data) {
        throw toStructureError(response.status, error, "Falha ao atualizar bloco");
      }
      const block = toBlock(data);
      if (!block) {
        throw new Error("StructureService.updateBlock: payload incompleto em PATCH /blocks/{id}");
      }
      return block;
    },
    onSuccess: () => {
      notify.success("Bloco atualizado");
      void qc.invalidateQueries({ queryKey: ["blocks", condoId] });
    },
    onError: (err, vars) => {
      if (err instanceof StructureFormError && err.status === 400) return;
      notify.error("Não foi possível atualizar o bloco", { retry: () => m.mutate(vars) });
    },
  });

  return {
    updateBlock: (input: UpdateBlockInput, opts?: { onSuccess?: () => void }) =>
      m.mutate(input, opts),
    isPending: m.isPending,
    formError: m.error instanceof StructureFormError ? m.error.message : null,
    isError: m.isError,
  };
}
