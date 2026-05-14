import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Ticket } from "./filterTickets";

export function ticketQueryOptions(ticketId: string) {
  return queryOptions({
    queryKey: ["ticket", ticketId] as const,
    queryFn: async (): Promise<Ticket> => {
      const { data, error } = await api.GET("/tickets/{id}", {
        params: { path: { id: ticketId } },
      });
      if (error) throw new Error(`GET /tickets/${ticketId} failed`, { cause: error });
      if (!data) throw new Error(`GET /tickets/${ticketId} returned empty body`);
      return data as Ticket;
    },
    staleTime: 30_000,
  });
}

export function useTicket(ticketId: string) {
  return useQuery(ticketQueryOptions(ticketId));
}
