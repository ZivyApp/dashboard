import { env } from "@/lib/env";
import { getAccessToken } from "@/stores/session";
import type { Scope } from "@/features/scope/useScope";
import type { ActivityListInput, ActivityListResult, ActivityRepository } from "./types";

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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

function isActivityListResult(value: unknown): value is ActivityListResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.items)) return false;
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
