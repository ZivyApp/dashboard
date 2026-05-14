import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Ticket } from "./filterTickets";
import type { TicketStatus } from "@/ui/StatusBadge/StatusBadge";

const ACTIVE_STATUSES: TicketStatus[] = ["open", "in_progress"];

async function fetchByStatus(status: TicketStatus): Promise<Ticket[]> {
  const { data, error } = await api.GET("/tickets", {
    params: { query: { status } },
  });
  if (error) throw new Error(`GET /tickets?status=${status} failed`, { cause: error });
  return (data ?? []) as Ticket[];
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

  if (data && data.length > 200) {
    console.warn(
      `Inbox: ${data.length} tickets ativos no condo ${condoId}. Considerar paginação no Core.`,
    );
  }

  function refetch() {
    queries.forEach((q) => {
      void q.refetch();
    });
  }

  return { data, isPending, isFetching, isError, isSuccess, error, refetch };
}
