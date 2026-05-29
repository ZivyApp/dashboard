import { isTicketStatus, type TicketStatus } from "./ticket";

export const TICKET_EVENT_TYPES = ["status_changed", "assigned", "comment_added"] as const;
export type TicketEventType = (typeof TICKET_EVENT_TYPES)[number];

export const TICKET_ACTOR_TYPES = ["manager", "resident", "system"] as const;
export type TicketActorType = (typeof TICKET_ACTOR_TYPES)[number];

export interface TicketEvent {
  id: string;
  ticketId: string;
  eventType: TicketEventType;
  actorType: TicketActorType;
  actorId?: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

function isEventType(v: unknown): v is TicketEventType {
  return typeof v === "string" && (TICKET_EVENT_TYPES as readonly string[]).includes(v);
}

function isActorType(v: unknown): v is TicketActorType {
  return typeof v === "string" && (TICKET_ACTOR_TYPES as readonly string[]).includes(v);
}

/** Type guard para o payload de `GET /tickets/{id}/events` (tudo opcional na geração). */
export function isTicketEvent(v: unknown): v is {
  id: string;
  ticket_id: string;
  event_type: TicketEventType;
  actor_type: TicketActorType;
  actor_id?: string;
  created_at: string;
  payload?: Record<string, unknown>;
} {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.ticket_id === "string" &&
    typeof o.created_at === "string" &&
    isEventType(o.event_type) &&
    isActorType(o.actor_type) &&
    (o.payload === undefined || (typeof o.payload === "object" && o.payload !== null))
  );
}

/** Converte o payload cru em `TicketEvent`; devolve `null` quando o item é inválido. */
export function toTicketEvent(v: unknown): TicketEvent | null {
  if (!isTicketEvent(v)) return null;
  return {
    id: v.id,
    ticketId: v.ticket_id,
    eventType: v.event_type,
    actorType: v.actor_type,
    ...(v.actor_id !== undefined ? { actorId: v.actor_id } : {}),
    createdAt: v.created_at,
    payload: v.payload ?? {},
  };
}

/** Corpo de um comentário (`comment_added`), refinado de `payload.text`. */
export function commentText(ev: TicketEvent): string | null {
  const t = ev.payload.text;
  return typeof t === "string" && t.length > 0 ? t : null;
}

/** Refina `from`/`to` de um `status_changed`; `null` quando o Core não envia status válidos. */
export function statusChange(ev: TicketEvent): { from?: TicketStatus; to: TicketStatus } | null {
  const to = ev.payload.to;
  if (!isTicketStatus(to)) return null;
  const from = ev.payload.from;
  return isTicketStatus(from) ? { from, to } : { to };
}

export type TimelineItem =
  | { kind: "created"; id: string; at: string }
  | { kind: TicketEventType; id: string; at: string; event: TicketEvent };

/**
 * Monta a timeline ordenada ascendente. Prepende um item `created` UI-only
 * derivado de `ticketCreatedAt` — o Core não emite evento `created`.
 */
export function buildTimeline(
  events: TicketEvent[],
  ticketCreatedAt: string | undefined,
): TimelineItem[] {
  const items: TimelineItem[] = events
    .map((event) => ({ kind: event.eventType, id: event.id, at: event.createdAt, event }))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  if (ticketCreatedAt) {
    items.unshift({ kind: "created", id: "created:synthetic", at: ticketCreatedAt });
  }
  return items;
}
