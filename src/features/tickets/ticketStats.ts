import type { Ticket } from "@/types/ticket";

export interface TicketStats {
  open: number;
  inProgress: number;
  resolved: number;
  urgent: number;
}

export function ticketStats(tickets: Ticket[]): TicketStats {
  return {
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    // "Ativo" = ainda demanda ação (open/in_progress). resolved e closed não contam,
    // mesmo sendo high — senão urgências já resolvidas inflam o KPI.
    urgent: tickets.filter(
      (t) => t.priority === "high" && (t.status === "open" || t.status === "in_progress"),
    ).length,
  };
}
