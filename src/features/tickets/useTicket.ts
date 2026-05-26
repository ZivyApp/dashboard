import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Ticket } from "@/types/ticket";
import { isCompleteTicket } from "@/types/ticket";

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
