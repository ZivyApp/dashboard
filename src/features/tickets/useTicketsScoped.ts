import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Ticket } from "@/types/ticket";
import { isCompleteTicket } from "@/types/ticket";
import { useMyCondos, type CondoMembership } from "@/features/condo/useMyCondos";

async function fetchCondoTickets(condoId: string): Promise<Ticket[]> {
  const { data, error } = await api.GET("/tickets", {
    params: { query: {} },
    headers: { "X-Condo-ID": condoId },
  });
  if (error) {
    throw new Error("TicketsService.fetchByCondo: falha em GET /tickets", { cause: error });
  }
  return (data ?? []).filter(isCompleteTicket);
}

export interface CondoTickets {
  condo: CondoMembership;
  tickets: Ticket[];
}

export interface ScopedTicketsResult {
  byCondo: CondoTickets[];
  isPending: boolean;
  isError: boolean;
}

export function useTicketsScoped(): ScopedTicketsResult {
  const { data: condos } = useMyCondos();
  const list = condos ?? [];

  const results = useQueries({
    queries: list.map((condo) => ({
      // Sem refetchInterval/refetchOnWindowFocus (ao contrário de useTickets): a
      // Overview é um agregado leve cross-condo; polling × N condos seria desperdício.
      // staleTime cobre o refetch ao revisitar a página.
      queryKey: ["tickets", condo.condoId] as const,
      queryFn: () => fetchCondoTickets(condo.condoId),
      staleTime: 10_000,
    })),
  });

  const byCondo: CondoTickets[] = list.map((condo, i) => ({
    condo,
    tickets: results[i]?.data ?? [],
  }));

  return {
    byCondo,
    isPending: condos === undefined || results.some((r) => r.isPending),
    isError: results.some((r) => r.isError),
  };
}
