import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export function useClaimTicket(ticketId: string) {
  const qc = useQueryClient();
  // PATCH /tickets/{id}/assign não aceita body — o Core lê o manager autenticado
  // (MustUserFromContext) e auto-atribui. Atribuir a outro manager é o useAssignTo.
  const m = useMutation<void, Error, void>({
    mutationFn: async () => {
      const { error } = await api.PATCH("/tickets/{id}/assign", {
        params: { path: { id: ticketId } },
      });
      if (error) {
        throw new Error(`TicketsService.claim(${ticketId}): falha em PATCH /tickets/{id}/assign`, {
          cause: error,
        });
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      void qc.invalidateQueries({ queryKey: ["ticket-events", ticketId] });
      void qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  return {
    claim: (opts?: { onSuccess?: () => void }) => m.mutate(undefined, opts),
    isPending: m.isPending,
    isError: m.isError,
  };
}
