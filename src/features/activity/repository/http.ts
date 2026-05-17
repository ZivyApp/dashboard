import { env } from "@/lib/env";
import { getAccessToken } from "@/stores/session";
import type { Scope } from "@/features/scope/useScope";
import {
  ACTIVITY_KINDS,
  type ActivityEvent,
  type ActivityKind,
  type ActivityListInput,
  type ActivityListResult,
  type ActivityRepository,
  type ResourceRef,
} from "./types";

function requireToken(): string {
  const token = getAccessToken();
  if (!token) {
    throw new Error("HttpActivityRepository: sem token de acesso (sessão expirou?)");
  }
  return token;
}

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${requireToken()}` };
}

function urlFor(input: ActivityListInput): string {
  const params = new URLSearchParams();
  if (input.scope?.kind === "condo") params.set("condo_id", input.scope.condoId);
  if (input.tab) params.set("tab", input.tab);
  if (input.cursor) params.set("cursor", input.cursor);
  if (typeof input.limit === "number") params.set("limit", String(input.limit));
  const q = params.toString();
  return `${env.CORE_API_URL}/activity${q ? `?${q}` : ""}`;
}

function isActivityKind(v: unknown): v is ActivityKind {
  return typeof v === "string" && (ACTIVITY_KINDS as readonly string[]).includes(v);
}

function isResourceRef(v: unknown): v is ResourceRef {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  if (r.type === "ticket") return typeof r.ticketId === "string";
  if (r.type === "resident_approval") return typeof r.residentId === "string";
  return false;
}

function isActivityEvent(v: unknown): v is ActivityEvent {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    isActivityKind(e.kind) &&
    typeof e.condoId === "string" &&
    typeof e.condoName === "string" &&
    typeof e.title === "string" &&
    typeof e.occurredAt === "string" &&
    (e.readAt === null || typeof e.readAt === "string") &&
    isResourceRef(e.resourceRef)
  );
}

function isActivityListResult(value: unknown): value is ActivityListResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.items)) return false;
  if (!v.items.every(isActivityEvent)) return false;
  if (typeof v.counts !== "object" || v.counts === null) return false;
  return true;
}

export function createHttpActivityRepository(): ActivityRepository {
  async function list(input: ActivityListInput): Promise<ActivityListResult> {
    const res = await fetch(urlFor(input), { headers: authHeaders() });
    if (!res.ok) {
      throw new Error(`HttpActivityRepository.list: HTTP ${res.status}`);
    }
    const payload: unknown = await res.json();
    if (!isActivityListResult(payload)) {
      throw new Error("HttpActivityRepository.list: invalid response shape");
    }
    return payload;
  }

  async function markRead(id: string): Promise<void> {
    const res = await fetch(`${env.CORE_API_URL}/activity/${encodeURIComponent(id)}/read`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!res.ok) {
      throw new Error(`HttpActivityRepository.markRead: HTTP ${res.status}`);
    }
  }

  async function markAllRead(scope?: Scope): Promise<void> {
    const body = scope?.kind === "condo" ? { condo_id: scope.condoId } : {};
    const res = await fetch(`${env.CORE_API_URL}/activity/read-all`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`HttpActivityRepository.markAllRead: HTTP ${res.status}`);
    }
  }

  return { list, markRead, markAllRead };
}
