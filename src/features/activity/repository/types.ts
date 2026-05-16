import type { Scope } from "@/features/scope/useScope";

// Alinhado com KIND_ICON em docs/handoff/.../page-inbox.jsx:15–20.
// Urgência NÃO é kind separado — vem em `priority`.
export const ACTIVITY_KINDS = [
  "ticket_new",
  "ticket_comment",
  "approval",
  "status_change",
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export type ActivityPriority = "low" | "medium" | "high" | "urgent";

export type ResourceRef =
  | { type: "ticket"; ticketId: string }
  | { type: "resident_approval"; residentId: string };

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  condoId: string;
  condoName: string;
  title: string;
  subtitle?: string; // ".ii-sub" no handoff (texto livre com separadores ·)
  resourceRef: ResourceRef;
  priority?: ActivityPriority; // só faz sentido para kind=ticket_new (urgent → faixa lateral vermelha)
  occurredAt: string; // ISO 8601 — formatado por formatRelTime para ".ii-time"
  readAt: string | null; // null = unread (gera .inbox-item.unread no handoff)
  avatar?: string; // 2 chars maiúsculos (ex.: "PO") — opcional, fallback para ícone do kind
}

export type ActivityTab = "all" | "unread" | "approvals";

export interface ActivityListInput {
  scope?: Scope;
  tab?: ActivityTab;
  cursor?: string;
  limit?: number;
}

export interface ActivityListResult {
  items: ActivityEvent[];
  nextCursor?: string;
  counts: Record<ActivityTab, number>;
}

export interface ActivityRepository {
  list(input: ActivityListInput): Promise<ActivityListResult>;
  markRead(id: string): Promise<void>;
  markAllRead(scope?: Scope): Promise<void>;
}
