import { describe, expect, it, beforeEach } from "vitest";
import { FIXTURES } from "./fixtures";
import { createLocalActivityRepository } from "./local";

beforeEach(() => {
  localStorage.clear();
});

describe("LocalActivityRepository", () => {
  it("lista todos os eventos sem scope", async () => {
    const repo = createLocalActivityRepository({ events: FIXTURES });
    const res = await repo.list({});
    expect(res.items.length).toBe(FIXTURES.length);
    expect(res.counts.all).toBe(FIXTURES.length);
  });

  it("filtra por scope condo", async () => {
    const repo = createLocalActivityRepository({ events: FIXTURES });
    const res = await repo.list({ scope: { kind: "condo", condoId: "c-jardins" } });
    expect(res.items.every((e) => e.condoId === "c-jardins")).toBe(true);
  });

  it("filtra por tab=unread", async () => {
    const repo = createLocalActivityRepository({ events: FIXTURES });
    const res = await repo.list({ tab: "unread" });
    expect(res.items.every((e) => e.readAt === null)).toBe(true);
  });

  it("filtra por tab=approvals", async () => {
    const repo = createLocalActivityRepository({ events: FIXTURES });
    const res = await repo.list({ tab: "approvals" });
    expect(res.items.every((e) => e.kind === "approval")).toBe(true);
  });

  it("counts reflete totais por tab respeitando scope", async () => {
    const repo = createLocalActivityRepository({ events: FIXTURES });
    const res = await repo.list({ scope: { kind: "condo", condoId: "c-jardins" } });
    expect(res.counts.all).toBeGreaterThan(0);
    expect(res.counts.unread).toBeGreaterThan(0);
    expect(res.counts.approvals).toBeGreaterThan(0);
  });

  it("ordena por occurredAt desc", async () => {
    const repo = createLocalActivityRepository({ events: FIXTURES });
    const res = await repo.list({});
    const times = res.items.map((e) => Date.parse(e.occurredAt));
    for (let i = 1; i < times.length; i += 1) {
      const prev = times[i - 1] ?? 0;
      const cur = times[i] ?? 0;
      expect(prev).toBeGreaterThanOrEqual(cur);
    }
  });

  it("markRead persiste e idempotente", async () => {
    const repo = createLocalActivityRepository({ events: FIXTURES });
    await repo.markRead("ev-1");
    let res = await repo.list({ tab: "unread" });
    expect(res.items.find((e) => e.id === "ev-1")).toBeUndefined();
    await repo.markRead("ev-1"); // idempotente — sem throw
    res = await repo.list({ tab: "unread" });
    expect(res.items.find((e) => e.id === "ev-1")).toBeUndefined();
  });

  it("markAllRead marca tudo do scope", async () => {
    const repo = createLocalActivityRepository({ events: FIXTURES });
    await repo.markAllRead({ kind: "condo", condoId: "c-jardins" });
    const res = await repo.list({
      scope: { kind: "condo", condoId: "c-jardins" },
      tab: "unread",
    });
    expect(res.items.length).toBe(0);
    // outro condo continua com não lidos
    const other = await repo.list({
      scope: { kind: "condo", condoId: "c-vilamar" },
      tab: "unread",
    });
    expect(other.items.length).toBeGreaterThan(0);
  });

  it("markAllRead sem scope marca tudo", async () => {
    const repo = createLocalActivityRepository({ events: FIXTURES });
    await repo.markAllRead();
    const res = await repo.list({ tab: "unread" });
    expect(res.items.length).toBe(0);
  });
});
