import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { RepositoryContext } from "./RepositoryProvider";
import { createLocalActivityRepository } from "./repository/local";
import { FIXTURES } from "./repository/fixtures";
import { useMarkRead } from "./useMarkRead";

function makeWrapper() {
  const repo = createLocalActivityRepository({ events: FIXTURES });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <RepositoryContext.Provider value={repo}>{children}</RepositoryContext.Provider>
      </QueryClientProvider>
    );
  }
  return { Wrapper, repo, qc };
}

describe("useMarkRead", () => {
  it("chama repo.markRead", async () => {
    const { Wrapper, repo } = makeWrapper();
    const { result } = renderHook(() => useMarkRead(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.markRead("ev-1");
    });
    const res = await repo.list({ tab: "unread" });
    expect(res.items.find((e) => e.id === "ev-1")).toBeUndefined();
  });

  it("markAllRead respeita scope", async () => {
    const { Wrapper, repo } = makeWrapper();
    const { result } = renderHook(() => useMarkRead(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.markAllRead({ kind: "condo", condoId: "c-jardins" });
    });
    const res = await repo.list({
      scope: { kind: "condo", condoId: "c-jardins" },
      tab: "unread",
    });
    expect(res.items.length).toBe(0);
  });
});
