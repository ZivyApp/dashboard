import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { TicketStatus } from "@/types/ticket";

export function useUpdateStatus(ticketId: string) {
  const qc = useQueryClient();
  const m = useMutation<void, Error, TicketStatus>({
    mutationFn: async (status) => {
      const { error } = await api.PATCH("/tickets/{id}/status", {
        params: { path: { id: ticketId } },
        body: { status },
      });
      if (error) {
        throw new Error(
          `TicketsService.updateStatus(${ticketId}): falha em PATCH /tickets/{id}/status`,
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
    updateStatus: (status: TicketStatus, opts?: { onSuccess?: () => void }) =>
      m.mutate(status, opts),
    pendingStatus: m.isPending ? m.variables : undefined,
    isError: m.isError,
  };
}
