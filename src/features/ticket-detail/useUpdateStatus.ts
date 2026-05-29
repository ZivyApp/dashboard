import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";
import { STATUS_LABELS, type TicketStatus } from "@/types/ticket";

export function useUpdateStatus(ticketId: string) {
  const qc = useQueryClient();
  // Otimismo é estado local: nunca escrevemos no cache do ticket durante a janela.
  // O consumidor exibe `pendingStatus ?? data.status`. Sem cache otimista não há
  // rollback a fazer no undo (basta limpar pending) nem clobber na coalescência.
  const [pending, setPending] = useState<TicketStatus | undefined>(undefined);

  // Commit autossuficiente: captura `ticketId`/`qc` do render onde `updateStatus`
  // rodou e faz PATCH + invalidação direto (sem useMutation). Assim funciona mesmo
  // depois do unmount (commit-on-close ainda invalida o cache) e sempre mira o
  // ticket correto, mesmo que a página já tenha trocado de `ticketId`.
  async function commit(target: TicketStatus) {
    let failed = false;
    try {
      const { error } = await api.PATCH("/tickets/{id}/status", {
        params: { path: { id: ticketId } },
        body: { status: target },
      });
      failed = Boolean(error);
    } catch {
      failed = true;
    }
    if (failed) {
      // Sem otimista no cache para reverter; o refetch mostra a verdade do servidor.
      void qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      notify.error("Não foi possível alterar status", { retry: () => void commit(target) });
      return;
    }
    void qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
    void qc.invalidateQueries({ queryKey: ["ticket-events", ticketId] });
    void qc.invalidateQueries({ queryKey: ["tickets"] });
  }

  function updateStatus(target: TicketStatus) {
    setPending(target);
    notify.deferred(`ticket-status-${ticketId}`, `Status alterado para ${STATUS_LABELS[target]}`, {
      delayMs: 5000,
      onCommit: () => {
        setPending(undefined);
        void commit(target);
      },
      onUndo: () => setPending(undefined),
    });
  }

  return {
    updateStatus,
    pendingStatus: pending,
  };
}
