import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Mock @/api/client antes de qualquer import dele — evita carregar src/lib/env
// (que faz assertEnv e quebra em CI sem .env.local). Padrão CLAUDE.md.
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock("@/api/client", () => ({
  api: { GET: mockGet },
  configureApiAuth: vi.fn(),
}));

import { useTickets } from "./useTickets";

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
  mockGet.mockReset();
  vi.restoreAllMocks();
});

describe("useTickets", () => {
  it("dispara 2 calls em paralelo (open + in_progress) e mescla resultado", async () => {
    mockGet.mockImplementation((_path: string, opts: { params: { query: { status: string } } }) => {
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
    const { result } = renderHook(() => useTickets("condo-1"), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(result.current.data?.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });

  it("retorna erro se uma das duas chamadas falhar", async () => {
    mockGet.mockImplementation((_path: string, opts: { params: { query: { status: string } } }) => {
      if (opts.params.query.status === "open") {
        return Promise.resolve({ data: undefined, error: { message: "boom" } });
      }
      return Promise.resolve({ data: [], error: undefined });
    });

    const qc = mkClient();
    const { result } = renderHook(() => useTickets("condo-1"), { wrapper: wrapper(qc) });
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
    mockGet.mockResolvedValue({ data: big, error: undefined });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const qc = mkClient();
    const { result } = renderHook(() => useTickets("condo-1"), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Tickets"));
  });
});
