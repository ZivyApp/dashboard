import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { api } from "@/api/client";
import { useInboxTickets } from "./useInboxTickets";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const mkClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useInboxTickets", () => {
  it("dispara 2 calls em paralelo (open + in_progress) e mescla resultado", async () => {
    const get = vi.spyOn(api, "GET").mockImplementation((
      _path: string,
      opts: { params: { query: { status: string } } },
    ) => {
      const status = opts.params.query.status;
      if (status === "open") {
        return Promise.resolve({
          data: [
            {
              id: "a",
              protocol: "TKT-1",
              title: "x",
              status: "open",
              priority: "high",
              updated_at: "2026-05-14T00:00:00Z",
            },
          ],
          error: undefined,
        });
      }
      return Promise.resolve({
        data: [
          {
            id: "b",
            protocol: "TKT-2",
            title: "y",
            status: "in_progress",
            priority: "low",
            updated_at: "2026-05-14T00:00:00Z",
          },
        ],
        error: undefined,
      });
    });

    const qc = mkClient();
    const { result } = renderHook(() => useInboxTickets("condo-1"), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledTimes(2);
    expect(result.current.data?.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });

  it("retorna erro se uma das duas chamadas falhar", async () => {
    vi.spyOn(api, "GET").mockImplementation((
      _: string,
      opts: { params: { query: { status: string } } },
    ) => {
      if (opts.params.query.status === "open") {
        return Promise.resolve({ data: undefined, error: { message: "boom" } });
      }
      return Promise.resolve({ data: [], error: undefined });
    });

    const qc = mkClient();
    const { result } = renderHook(() => useInboxTickets("condo-1"), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("emite console.warn quando lista total > 200", async () => {
    const big = Array.from({ length: 201 }, (_, i) => ({
      id: `t${i}`,
      protocol: `TKT-${i}`,
      title: "x",
      status: "open" as const,
      priority: "low" as const,
      updated_at: "2026-05-14T00:00:00Z",
    }));
    vi.spyOn(api, "GET").mockResolvedValue({ data: big, error: undefined });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const qc = mkClient();
    const { result } = renderHook(() => useInboxTickets("condo-1"), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Inbox"));
  });
});
