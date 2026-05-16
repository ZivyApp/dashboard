import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { RepositoryContext } from "./RepositoryProvider";
import { createLocalActivityRepository } from "./repository/local";
import { FIXTURES } from "./repository/fixtures";
import { useActivityFeed } from "./useActivityFeed";

function wrapper({ children }: { children: ReactNode }) {
  const repo = createLocalActivityRepository({ events: FIXTURES });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <RepositoryContext.Provider value={repo}>{children}</RepositoryContext.Provider>
    </QueryClientProvider>
  );
}

describe("useActivityFeed", () => {
  it("retorna lista e counts", async () => {
    const { result } = renderHook(() => useActivityFeed({ tab: "all" }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items.length).toBeGreaterThan(0);
    expect(result.current.data?.counts.all).toBeGreaterThan(0);
  });
});
