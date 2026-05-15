import { useCallback, useEffect } from "react";
import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Ticket } from "./types";
import { isTicketStatus, isTicketPriority, type TicketStatus } from "./types";

// Duas queries paralelas porque GET /tickets aceita apenas um `status` por chamada.
// Quando Core suportar CSV (ex.: `status=open,in_progress`), trocar por um useQuery único.
const ACTIVE_STATUSES: TicketStatus[] = ["open", "in_progress"];

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

async function fetchByStatus(status: TicketStatus): Promise<Ticket[]> {
  const { data, error } = await api.GET("/tickets", {
    params: { query: { status } },
  });
  if (error) {
    throw new Error(`TicketsService.fetchByStatus(${status}): falha em GET /tickets`, {
      cause: error,
    });
  }
  return (data ?? []).filter(isCompleteTicket);
}

export function useInboxTickets(condoId: string) {
  const queries = useQueries({
    queries: ACTIVE_STATUSES.map((status) => ({
      queryKey: ["tickets", condoId, status] as const,
      queryFn: () => fetchByStatus(status),
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
      staleTime: 10_000,
    })),
  });

  const isPending = queries.some((q) => q.isPending);
  const isFetching = queries.some((q) => q.isFetching);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.error)?.error;
  const isSuccess = queries.every((q) => q.isSuccess);

  const data = isSuccess ? queries.flatMap((q) => q.data ?? []) : undefined;

  useEffect(() => {
    if (data && data.length > 200) {
      console.warn(`Inbox: ${data.length} tickets ativos. Considerar paginação no Core.`);
    }
  }, [data]);

  const refetch = useCallback(() => {
    queries.forEach((q) => {
      void q.refetch();
    });
  }, [queries]);

  return { data, isPending, isFetching, isError, isSuccess, error, refetch };
}
