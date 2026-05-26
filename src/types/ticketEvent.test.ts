import { describe, it, expect } from "vitest";
import {
  isTicketEvent,
  toTicketEvent,
  commentText,
  statusChange,
  buildTimeline,
  type TicketEvent,
} from "./ticketEvent";

const raw = {
  id: "e1",
  ticket_id: "t1",
  event_type: "comment_added",
  actor_type: "manager",
  actor_id: "u1",
  created_at: "2026-05-20T10:00:00Z",
  payload: { text: "olá" },
};

describe("isTicketEvent / toTicketEvent", () => {
  it("aceita evento bem-formado", () => {
    expect(isTicketEvent(raw)).toBe(true);
    expect(toTicketEvent(raw)?.eventType).toBe("comment_added");
  });

  it("rejeita event_type desconhecido", () => {
    expect(isTicketEvent({ ...raw, event_type: "exploded" })).toBe(false);
    expect(toTicketEvent({ ...raw, event_type: "exploded" })).toBeNull();
  });

  it("rejeita actor_type desconhecido", () => {
    expect(isTicketEvent({ ...raw, actor_type: "alien" })).toBe(false);
  });

  it("rejeita quando falta created_at", () => {
    const rest: Record<string, unknown> = { ...raw };
    delete rest.created_at;
    expect(isTicketEvent(rest)).toBe(false);
  });
});

describe("commentText", () => {
  it("extrai payload.text de comment_added", () => {
    const ev = toTicketEvent(raw) as TicketEvent;
    expect(commentText(ev)).toBe("olá");
  });
  it("devolve null quando não há text", () => {
    const ev = toTicketEvent({ ...raw, payload: {} }) as TicketEvent;
    expect(commentText(ev)).toBeNull();
  });
});

describe("statusChange", () => {
  it("refina from/to válidos", () => {
    const ev = toTicketEvent({
      ...raw,
      event_type: "status_changed",
      payload: { from: "open", to: "in_progress" },
    }) as TicketEvent;
    expect(statusChange(ev)).toEqual({ from: "open", to: "in_progress" });
  });
  it("devolve null quando payload não tem status válido", () => {
    const ev = toTicketEvent({
      ...raw,
      event_type: "status_changed",
      payload: { note: "x" },
    }) as TicketEvent;
    expect(statusChange(ev)).toBeNull();
  });
});

describe("buildTimeline", () => {
  it("prepende item created UI-only a partir de createdAt e ordena asc", () => {
    const events: TicketEvent[] = [
      toTicketEvent(raw) as TicketEvent, // comment 10:00
      toTicketEvent({
        ...raw,
        id: "e2",
        event_type: "assigned",
        created_at: "2026-05-20T09:00:00Z",
        payload: {},
      }) as TicketEvent,
    ];
    const tl = buildTimeline(events, "2026-05-20T08:00:00Z");
    expect(tl.map((i) => i.kind)).toEqual(["created", "assigned", "comment_added"]);
    expect(tl[0]?.id).toBe("created:synthetic");
  });

  it("sem createdAt não cria item synthetic", () => {
    const tl = buildTimeline([], undefined);
    expect(tl).toHaveLength(0);
  });
});
