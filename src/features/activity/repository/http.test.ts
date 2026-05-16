import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { CORE_API_URL: "http://core.test" },
}));

vi.mock("@/stores/session", () => ({
  getAccessToken: vi.fn(() => "tok"),
}));

import { createHttpActivityRepository } from "./http";

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function okJson(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("HttpActivityRepository", () => {
  function firstFetchUrl(spy: { mock: { calls: unknown[][] } }): string {
    const arg = spy.mock.calls[0]?.[0];
    if (typeof arg !== "string") {
      throw new Error("expected fetch to be called with string url");
    }
    return arg;
  }

  it("list: monta querystring com condo_id e tab", async () => {
    const spy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(okJson({ items: [], counts: { all: 0, unread: 0, approvals: 0 } }));

    const repo = createHttpActivityRepository();
    await repo.list({ scope: { kind: "condo", condoId: "c1" }, tab: "unread" });

    const url = firstFetchUrl(spy);
    expect(url).toContain("http://core.test/activity");
    expect(url).toContain("condo_id=c1");
    expect(url).toContain("tab=unread");
  });

  it("list: passa cursor e limit quando informados", async () => {
    const spy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(okJson({ items: [], counts: { all: 0, unread: 0, approvals: 0 } }));

    const repo = createHttpActivityRepository();
    await repo.list({ cursor: "abc", limit: 25 });

    const url = firstFetchUrl(spy);
    expect(url).toContain("cursor=abc");
    expect(url).toContain("limit=25");
  });

  it("list: envia Authorization Bearer quando há token", async () => {
    const spy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(okJson({ items: [], counts: { all: 0, unread: 0, approvals: 0 } }));

    const repo = createHttpActivityRepository();
    await repo.list({});

    const init = spy.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer tok");
  });

  it("list: lança erro em status não-ok", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 500 }));
    const repo = createHttpActivityRepository();
    await expect(repo.list({})).rejects.toThrow(/HTTP 500/);
  });

  it("list: lança erro quando payload não casa com shape", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(okJson({ items: "not-an-array" }));
    const repo = createHttpActivityRepository();
    await expect(repo.list({})).rejects.toThrow(/invalid response/i);
  });

  it("markRead: POST em /activity/{id}/read", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    const repo = createHttpActivityRepository();
    await repo.markRead("ev-1");

    const url = firstFetchUrl(spy);
    const init = spy.mock.calls[0]?.[1];
    expect(url).toBe("http://core.test/activity/ev-1/read");
    expect(init?.method).toBe("POST");
  });

  it("markRead: lança em status não-ok", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 404 }));
    const repo = createHttpActivityRepository();
    await expect(repo.markRead("ev-x")).rejects.toThrow(/HTTP 404/);
  });

  it("markAllRead: POST /activity/read-all com condo_id no body", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    const repo = createHttpActivityRepository();
    await repo.markAllRead({ kind: "condo", condoId: "c1" });

    const url = firstFetchUrl(spy);
    const init = spy.mock.calls[0]?.[1];
    expect(url).toBe("http://core.test/activity/read-all");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ condo_id: "c1" }));
    const headers = new Headers(init?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("markAllRead: sem scope envia body vazio", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    const repo = createHttpActivityRepository();
    await repo.markAllRead();

    const init = spy.mock.calls[0]?.[1];
    expect(init?.body).toBe(JSON.stringify({}));
  });

  it("propaga erro de rede do fetch", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
    const repo = createHttpActivityRepository();
    await expect(repo.list({})).rejects.toThrow(/network down/);
  });
});
