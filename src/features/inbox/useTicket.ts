import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Ticket } from "./filterTickets";
import { isTicketStatus, isTicketPriority } from "./types";

function isCompleteTicket(t: unknown): t is Ticket {
  if (typeof t !== "object" || t === null) return false;
  const o = t as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.protocol === "string" &&
    typeof o.title === "string" &&
    typeof o.updated_at === "string" &&
    isTicketStatus(o.status) &&
    isTicketPriority(o.priority)
  );
}

export function ticketQueryOptions(ticketId: string) {
  return queryOptions({
    queryKey: ["ticket", ticketId] as const,
    queryFn: async (): Promise<Ticket> => {
      const { data, error } = await api.GET("/tickets/{id}", {
        params: { path: { id: ticketId } },
      });
      if (error) {
        throw new Error(`TicketsService.fetchById(${ticketId}): falha em GET /tickets/{id}`, {
          cause: error,
        });
      }
      if (!data) {
        throw new Error(
          `TicketsService.fetchById(${ticketId}): GET /tickets/{id} retornou body vazio`,
        );
      }
      if (!isCompleteTicket(data)) {
        throw new Error(
          `TicketsService.fetchById(${ticketId}): GET /tickets/{id} retornou payload incompleto`,
        );
      }
      return data;
    },
    staleTime: 30_000,
  });
}

export function useTicket(ticketId: string) {
  return useQuery(ticketQueryOptions(ticketId));
}
