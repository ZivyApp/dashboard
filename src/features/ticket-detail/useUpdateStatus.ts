import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";
import type { TicketStatus } from "@/types/ticket";

const LABEL: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
};

export function useUpdateStatus(ticketId: string) {
  const qc = useQueryClient();
  // Otimismo é estado local: nunca escrevemos no cache do ticket durante a janela.
  // O consumidor exibe `pendingStatus ?? data.status`. Sem cache otimista não há
  // rollback a fazer no undo (basta limpar pending) nem clobber na coalescência.
  const [pending, setPending] = useState<TicketStatus | undefined>(undefined);

  const m = useMutation<void, Error, TicketStatus>({
    mutationFn: async (status) => {
      const { error } = await api.PATCH("/tickets/{id}/status", {
        params: { path: { id: ticketId } },
        body: { status },
      });
      if (error) {
        throw new Error(
          `TicketsService.updateStatus(${ticketId}): falha em PATCH /tickets/{id}/status`,
          { cause: error },
        );
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      void qc.invalidateQueries({ queryKey: ["ticket-events", ticketId] });
      void qc.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (_e, vars) => {
      // Não há otimista no cache para reverter; o refetch garante que a UI mostre
      // a verdade do servidor (o status que não mudou). Avisa com retry.
      void qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      notify.error("Não foi possível alterar status", {
        retry: () => m.mutate(vars),
      });
    },
  });

  // Handler de onClick — identidade não importa, sem useCallback de fachada.
  function updateStatus(targetStatus: TicketStatus) {
    setPending(targetStatus);
    notify.deferred(`ticket-status-${ticketId}`, `Status alterado para ${LABEL[targetStatus]}`, {
      delayMs: 5000,
      onCommit: () => {
        setPending(undefined);
        m.mutate(targetStatus);
      },
      onUndo: () => setPending(undefined),
    });
  }

  return {
    updateStatus,
    pendingStatus: pending,
    isError: m.isError,
  };
}
