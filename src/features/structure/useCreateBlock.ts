import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";
import { toBlock, type Block } from "./block";
import { StructureFormError, toStructureError } from "./structureError";

export interface CreateBlockInput {
  name: string;
  description?: string;
}

export function useCreateBlock(condoId: string) {
  const qc = useQueryClient();
  const m = useMutation<Block, StructureFormError | Error, CreateBlockInput>({
    mutationFn: async (input) => {
      const { data, error, response } = await api.POST("/blocks", {
        body: {
          name: input.name,
          ...(input.description !== undefined ? { description: input.description } : {}),
        },
      });
      if (error || !data) {
        throw toStructureError(response.status, error, "Falha ao criar bloco");
      }
      const block = toBlock(data);
      if (!block) {
        throw new Error("StructureService.createBlock: payload incompleto em POST /blocks");
      }
      return block;
    },
    onSuccess: () => {
      notify.success("Bloco criado");
      void qc.invalidateQueries({ queryKey: ["blocks", condoId] });
    },
    onError: (err, vars) => {
      // 400 → banner inline no modal (formError); toast duplicaria a mensagem.
      if (err instanceof StructureFormError && err.status === 400) return;
      notify.error("Não foi possível criar o bloco", { retry: () => m.mutate(vars) });
    },
  });

  return {
    createBlock: (input: CreateBlockInput, opts?: { onSuccess?: () => void }) =>
      m.mutate(input, opts),
    isPending: m.isPending,
    formError: m.error instanceof StructureFormError ? m.error.message : null,
    isError: m.isError,
  };
}
