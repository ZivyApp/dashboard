import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { toTicketEvent, type TicketEvent } from "@/types/ticketEvent";

export function ticketEventsQueryOptions(ticketId: string) {
  return queryOptions({
    queryKey: ["ticket-events", ticketId] as const,
    queryFn: async (): Promise<TicketEvent[]> => {
      const { data, error } = await api.GET("/tickets/{id}/events", {
        params: { path: { id: ticketId } },
      });
      if (error) {
        throw new Error(`TicketsService.events(${ticketId}): falha em GET /tickets/{id}/events`, {
          cause: error,
        });
      }
      return (data ?? []).map(toTicketEvent).filter((e): e is TicketEvent => e !== null);
    },
    staleTime: 30_000,
  });
}

export function useTicketEvents(ticketId: string) {
  return useQuery(ticketEventsQueryOptions(ticketId));
}
