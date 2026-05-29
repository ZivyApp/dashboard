import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";
import type { CondoManager } from "./useCondoManagers";

export function useAssignTo(ticketId: string, condoId: string) {
  const qc = useQueryClient();
  const m = useMutation<void, Error, string>({
    mutationFn: async (assigneeId) => {
      const { error } = await api.PATCH("/tickets/{id}/assign-to", {
        params: { path: { id: ticketId } },
        body: { assignee_id: assigneeId },
      });
      if (error) {
        throw new Error(
          `TicketsService.assignTo(${ticketId}): falha em PATCH /tickets/{id}/assign-to`,
          { cause: error },
        );
      }
    },
    onSuccess: (_data, assigneeId) => {
      void qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      void qc.invalidateQueries({ queryKey: ["ticket-events", ticketId] });
      void qc.invalidateQueries({ queryKey: ["tickets"] });
      const managers = qc.getQueryData<CondoManager[]>(["condo-managers", condoId]) ?? [];
      const target = managers.find((p) => p.userId === assigneeId);
      notify.success(`Atribuído a ${target?.label ?? "novo responsável"}`);
    },
    onError: (_e, vars) => {
      notify.error("Não foi possível atribuir", {
        retry: () => m.mutate(vars),
      });
    },
  });

  return {
    assignTo: (assigneeId: string, opts?: { onSuccess?: () => void }) => m.mutate(assigneeId, opts),
    isPending: m.isPending,
    isError: m.isError,
  };
}
