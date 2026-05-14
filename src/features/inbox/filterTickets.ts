import type { TicketStatus, TicketPriority } from "./types";

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
  updated_at: string;
}

export interface FilterState {
  search: string;
  status: TicketStatus | "all";
  priority: TicketPriority | "all";
}

const PRIORITY_ORDER: Record<TicketPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function matchesSearch(ticket: Ticket, q: string): boolean {
  const needle = q.toLowerCase();
  if (!needle) return true;
  if (ticket.title.toLowerCase().includes(needle)) return true;
  if (ticket.protocol.toLowerCase().includes(needle)) return true;
  if (ticket.resident_name?.toLowerCase().includes(needle)) return true;
  return false;
}

export function filterTickets(list: Ticket[], filters: FilterState): Ticket[] {
  const filtered = list.filter((t) => {
    if (filters.status !== "all" && t.status !== filters.status) return false;
    if (filters.priority !== "all" && t.priority !== filters.priority) return false;
    if (!matchesSearch(t, filters.search)) return false;
    return true;
  });
  return [...filtered].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 99;
    const pb = PRIORITY_ORDER[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    return Date.parse(b.updated_at) - Date.parse(a.updated_at);
  });
}
