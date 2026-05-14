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
