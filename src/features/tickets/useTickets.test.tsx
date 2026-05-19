import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Mock @/api/client antes de qualquer import dele — evita carregar src/lib/env
// (que faz assertEnv e quebra em CI sem .env.local). Padrão CLAUDE.md.
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock("@/api/client", () => ({
  api: { GET: mockGet },
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
  it("dispara 1 call sem filtro de status e devolve todos os tickets", async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          id: "a",
          protocol: "TKT-1",
          title: "x",
          status: "open",
          priority: "high",
          updated_at: "2026-05-14T00:00:00Z",
        },
        {
          id: "b",
          protocol: "TKT-2",
          title: "y",
          status: "resolved",
          priority: "low",
          updated_at: "2026-05-14T00:00:00Z",
        },
        {
          id: "c",
          protocol: "TKT-3",
          title: "z",
          status: "closed",
          priority: "medium",
          updated_at: "2026-05-14T00:00:00Z",
        },
      ],
      error: undefined,
    });

    const qc = mkClient();
    const { result } = renderHook(() => useTickets("condo-1"), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith("/tickets", { params: { query: {} } });
    expect(result.current.data?.map((t) => t.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("filtra payloads incompletos via isCompleteTicket", async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          id: "a",
          protocol: "TKT-1",
          title: "x",
          status: "open",
          priority: "high",
          updated_at: "2026-05-14T00:00:00Z",
        },
        { id: "b" }, // payload incompleto — deve sumir
      ],
      error: undefined,
    });

    const qc = mkClient();
    const { result } = renderHook(() => useTickets("condo-1"), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((t) => t.id)).toEqual(["a"]);
  });

  it("retorna erro quando a chamada falha", async () => {
    mockGet.mockResolvedValue({ data: undefined, error: { message: "boom" } });

    const qc = mkClient();
    const { result } = renderHook(() => useTickets("condo-1"), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("emite console.warn quando lista > 200", async () => {
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
