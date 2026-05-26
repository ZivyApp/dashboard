export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["low", "medium", "high"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export function isTicketStatus(v: unknown): v is TicketStatus {
  return typeof v === "string" && (TICKET_STATUSES as readonly string[]).includes(v);
}

export function isTicketPriority(v: unknown): v is TicketPriority {
  return typeof v === "string" && (TICKET_PRIORITIES as readonly string[]).includes(v);
}

export interface Ticket {
  id: string;
  protocol: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  resident_name?: string;
  unit_number?: string;
  block_name?: string;
  common_area_name?: string;
  description?: string;
  /** user_id do manager atribuído (vazio quando não atribuído). */
  assigned_to?: string;
  created_at?: string;
  updated_at: string;
}

/**
 * Type guard para o payload da API gerada (`openapi-typescript` marca tudo
 * opcional). Valida cada campo obrigatório individualmente — usar com
 * `filter(isCompleteTicket)` em listas ou `throw` descritivo em singular.
 */
export function isCompleteTicket(t: unknown): t is Ticket {
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
