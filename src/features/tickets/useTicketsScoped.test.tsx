import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { CondoMembership } from "@/features/condo/useMyCondos";

const { mockGet, mockUseMyCondos } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockUseMyCondos: vi.fn(),
}));
vi.mock("@/api/client", () => ({ api: { GET: mockGet } }));
vi.mock("@/features/condo/useMyCondos", () => ({ useMyCondos: mockUseMyCondos }));

import { useTicketsScoped } from "./useTicketsScoped";

const CONDOS: CondoMembership[] = [
  { condoId: "c1", condoName: "Solar", condoSlug: "solar", role: "manager" },
  { condoId: "c2", condoName: "Vista", condoSlug: "vista", role: "viewer" },
];

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

afterEach(() => {
  mockGet.mockReset();
  mockUseMyCondos.mockReset();
  vi.restoreAllMocks();
});

describe("useTicketsScoped", () => {
  it("faz fan-out por condo passando X-Condo-ID explícito e agrupa por condo", async () => {
    mockUseMyCondos.mockReturnValue({ data: CONDOS });
    mockGet.mockImplementation((_path: string, opts: { headers: Record<string, string> }) => {
      const condo = opts.headers["X-Condo-ID"];
      return Promise.resolve({
        data: [
          {
            id: `${condo}-t1`,
            protocol: "TKT-1",
            title: "x",
            status: "open",
            priority: "high",
            updated_at: "2026-05-20T00:00:00Z",
          },
        ],
        error: undefined,
      });
    });

    const { result } = renderHook(() => useTicketsScoped(), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockGet).toHaveBeenCalledWith("/tickets", {
      params: { query: {} },
      headers: { "X-Condo-ID": "c1" },
    });
    expect(result.current.byCondo.map((c) => c.condo.condoId)).toEqual(["c1", "c2"]);
    expect(result.current.byCondo[0]?.tickets[0]?.id).toBe("c1-t1");
  });

  it("filtra payloads incompletos via isCompleteTicket", async () => {
    mockUseMyCondos.mockReturnValue({ data: [CONDOS[0]] });
    mockGet.mockResolvedValue({
      data: [
        {
          id: "ok",
          protocol: "TKT-1",
          title: "x",
          status: "open",
          priority: "low",
          updated_at: "2026-05-20T00:00:00Z",
        },
        { id: "bad" },
      ],
      error: undefined,
    });
    const { result } = renderHook(() => useTicketsScoped(), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.byCondo[0]?.tickets.map((t) => t.id)).toEqual(["ok"]);
  });

  it("expõe isError quando alguma chamada falha", async () => {
    mockUseMyCondos.mockReturnValue({ data: [CONDOS[0]] });
    mockGet.mockResolvedValue({ data: undefined, error: { message: "boom" } });
    const { result } = renderHook(() => useTicketsScoped(), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("falha parcial: mantém os tickets dos condos que resolveram e marca isError", async () => {
    mockUseMyCondos.mockReturnValue({ data: CONDOS });
    mockGet.mockImplementation((_path: string, opts: { headers: Record<string, string> }) => {
      const condo = opts.headers["X-Condo-ID"];
      if (condo === "c2") {
        return Promise.resolve({ data: undefined, error: { message: "boom" } });
      }
      return Promise.resolve({
        data: [
          {
            id: `${condo}-t1`,
            protocol: "TKT-1",
            title: "x",
            status: "open",
            priority: "high",
            updated_at: "2026-05-20T00:00:00Z",
          },
        ],
        error: undefined,
      });
    });

    const { result } = renderHook(() => useTicketsScoped(), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
    await waitFor(() => expect(result.current.isPending).toBe(false));

    // c1 resolveu → mantém seus tickets; c2 falhou → lista vazia, mas o condo permanece.
    expect(result.current.byCondo.map((c) => c.condo.condoId)).toEqual(["c1", "c2"]);
    expect(result.current.byCondo[0]?.tickets.map((t) => t.id)).toEqual(["c1-t1"]);
    expect(result.current.byCondo[1]?.tickets).toEqual([]);
  });
});
