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

import { usePendingResidents } from "./usePendingResidents";

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

function residentRow(condo: string, id: string, status = "PENDING") {
  return { id, name: `Resident ${id}`, phone: "+5511999990000", status, condo_id: condo };
}

afterEach(() => {
  mockGet.mockReset();
  mockUseMyCondos.mockReset();
  vi.restoreAllMocks();
});

describe("usePendingResidents", () => {
  it("scope=condo: consulta só aquele condo e filtra PENDING", async () => {
    mockUseMyCondos.mockReturnValue({ data: CONDOS });
    mockGet.mockResolvedValue({
      data: [residentRow("c1", "r1"), residentRow("c1", "r2", "ACTIVE")],
      error: undefined,
    });

    const { result } = renderHook(() => usePendingResidents({ kind: "condo", condoId: "c1" }), {
      wrapper: wrapper(mkClient()),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith("/residents", { headers: { "X-Condo-ID": "c1" } });
    expect(result.current.residents).toHaveLength(1);
    expect(result.current.residents[0]).toMatchObject({ id: "r1", condoName: "Solar" });
  });

  it("scope=all: fan-out só sobre condos manager+ e concatena", async () => {
    mockUseMyCondos.mockReturnValue({ data: CONDOS });
    mockGet.mockImplementation((_p: string, opts: { headers: Record<string, string> }) =>
      Promise.resolve({ data: [residentRow(opts.headers["X-Condo-ID"]!, "r1")], error: undefined }),
    );

    const { result } = renderHook(() => usePendingResidents({ kind: "all" }), {
      wrapper: wrapper(mkClient()),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith("/residents", { headers: { "X-Condo-ID": "c1" } });
    expect(result.current.residents).toHaveLength(1);
    expect(result.current.residents[0]).toMatchObject({ condoId: "c1", condoName: "Solar" });
  });

  it("scope=all: achata residents de múltiplos condos manager+", async () => {
    const TWO_MANAGERS: CondoMembership[] = [
      { condoId: "c1", condoName: "Solar", condoSlug: "solar", role: "manager" },
      { condoId: "c3", condoName: "Mar", condoSlug: "mar", role: "manager" },
    ];
    mockUseMyCondos.mockReturnValue({ data: TWO_MANAGERS });
    mockGet.mockImplementation((_p: string, opts: { headers: Record<string, string> }) =>
      Promise.resolve({ data: [residentRow(opts.headers["X-Condo-ID"]!, "r1")], error: undefined }),
    );

    const { result } = renderHook(() => usePendingResidents({ kind: "all" }), {
      wrapper: wrapper(mkClient()),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(result.current.residents).toHaveLength(2);
    expect(result.current.residents.map((r) => r.condoId).sort()).toEqual(["c1", "c3"]);
  });

  it("propaga isError quando uma query falha", async () => {
    mockUseMyCondos.mockReturnValue({ data: CONDOS });
    mockGet.mockResolvedValue({ data: undefined, error: { message: "boom" } });

    const { result } = renderHook(() => usePendingResidents({ kind: "condo", condoId: "c1" }), {
      wrapper: wrapper(mkClient()),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
