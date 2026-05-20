import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Ticket } from "@/types/ticket";
import { isCompleteTicket } from "@/types/ticket";

async function fetchAllTickets(): Promise<Ticket[]> {
  const { data, error } = await api.GET("/tickets", { params: { query: {} } });
  if (error) {
    throw new Error("TicketsService.fetchAll: falha em GET /tickets", { cause: error });
  }
  return (data ?? []).filter(isCompleteTicket);
}

export function useTickets(condoId: string) {
  const query = useQuery({
    queryKey: ["tickets", condoId] as const,
    queryFn: fetchAllTickets,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (query.data && query.data.length > 200) {
      console.warn(`Tickets: ${query.data.length} tickets. Considerar paginação no Core.`);
    }
  }, [query.data]);

  return {
    data: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    isSuccess: query.isSuccess,
    error: query.error,
    refetch: query.refetch,
  };
}
