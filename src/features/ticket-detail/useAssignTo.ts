import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export function useAssignTo(ticketId: string) {
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
          {
            cause: error,
          },
        );
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      void qc.invalidateQueries({ queryKey: ["ticket-events", ticketId] });
    },
  });

  return {
    assignTo: (assigneeId: string, opts?: { onSuccess?: () => void }) => m.mutate(assigneeId, opts),
    isPending: m.isPending,
    isError: m.isError,
  };
}
