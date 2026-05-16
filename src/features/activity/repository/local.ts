import type {
  ActivityEvent,
  ActivityListInput,
  ActivityListResult,
  ActivityRepository,
  ActivityTab,
} from "./types";
import type { Scope } from "@/features/scope/useScope";

const STORAGE_KEY = "zivy.activity.reads";

/**
 * Limpa o estado de leituras persistido — chamar no logout para evitar que
 * dois usuários no mesmo browser herdem o `readAt` um do outro.
 */
export function clearActivityReads(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Safari Private Browsing — ignorar
  }
}

function safeRead(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function safeWrite(reads: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reads));
  } catch {
    // Safari Private Browsing pode lançar — ignorar
  }
}

function matchScope(event: ActivityEvent, scope?: Scope): boolean {
  if (!scope || scope.kind === "all") return true;
  return event.condoId === scope.condoId;
}

function applyReads(events: ActivityEvent[], reads: Record<string, string>): ActivityEvent[] {
  return events.map((e) => {
    const persisted = reads[e.id];
    if (persisted) return { ...e, readAt: persisted };
    return e;
  });
}

function matchTab(event: ActivityEvent, tab: ActivityTab): boolean {
  if (tab === "all") return true;
  if (tab === "unread") return event.readAt === null;
  if (tab === "approvals") return event.kind === "approval";
  return true;
}

export function createLocalActivityRepository(opts: {
  events: ActivityEvent[];
}): ActivityRepository {
  let base = [...opts.events];

  function list(input: ActivityListInput): Promise<ActivityListResult> {
    const reads = safeRead();
    const withReads = applyReads(base, reads);
    const scoped = withReads.filter((e) => matchScope(e, input.scope));
    const sorted = [...scoped].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));

    const counts: Record<ActivityTab, number> = {
      all: scoped.length,
      unread: scoped.filter((e) => e.readAt === null).length,
      approvals: scoped.filter((e) => e.kind === "approval").length,
    };

    const tab: ActivityTab = input.tab ?? "all";
    const filtered = sorted.filter((e) => matchTab(e, tab));
    const limit = input.limit ?? 50;
    return Promise.resolve({ items: filtered.slice(0, limit), counts });
  }

  function markRead(id: string): Promise<void> {
    const reads = safeRead();
    reads[id] = new Date().toISOString();
    safeWrite(reads);
    base = base.map((e) =>
      e.id === id && e.readAt === null ? { ...e, readAt: reads[id] ?? null } : e,
    );
    return Promise.resolve();
  }

  function markAllRead(scope?: Scope): Promise<void> {
    const reads = safeRead();
    const now = new Date().toISOString();
    for (const e of base) {
      if (e.readAt !== null) continue;
      if (!matchScope(e, scope)) continue;
      reads[e.id] = now;
    }
    safeWrite(reads);
    base = base.map((e) =>
      e.readAt === null && matchScope(e, scope) ? { ...e, readAt: reads[e.id] ?? null } : e,
    );
    return Promise.resolve();
  }

  return { list, markRead, markAllRead };
}
