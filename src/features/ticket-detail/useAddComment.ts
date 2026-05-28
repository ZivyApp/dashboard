import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export function useAddComment(ticketId: string) {
  const qc = useQueryClient();
  // service.AddComment só persiste o evento — NÃO dispara notificação Telegram.
  const m = useMutation<void, Error, string>({
    mutationFn: async (text) => {
      const { error } = await api.POST("/tickets/{id}/comments", {
        params: { path: { id: ticketId } },
        body: { text },
      });
      if (error) {
        throw new Error(
          `TicketsService.addComment(${ticketId}): falha em POST /tickets/{id}/comments`,
          {
            cause: error,
          },
        );
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ticket-events", ticketId] }),
  });

  return {
    addComment: (text: string, opts?: { onSuccess?: () => void }) => m.mutate(text, opts),
    isPending: m.isPending,
    isError: m.isError,
  };
}
