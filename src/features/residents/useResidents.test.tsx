import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Mock @/api/client antes do import — evita carregar src/lib/env (CLAUDE.md).
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { GET: mockGet } }));

import { useResidents } from "./useResidents";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

afterEach(() => {
  mockGet.mockReset();
  vi.restoreAllMocks();
});

describe("useResidents", () => {
  it("devolve todos os moradores válidos (sem filtrar status)", async () => {
    mockGet.mockResolvedValue({
      data: [
        { id: "r1", name: "Ana", status: "APPROVED" },
        { id: "r2", name: "Beto", status: "PENDING" },
      ],
      error: undefined,
    });
    const qc = mkClient();
    const { result } = renderHook(() => useResidents("c1"), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(mockGet).toHaveBeenCalledWith("/residents");
    expect(result.current.residents?.map((r) => r.id)).toEqual(["r1", "r2"]);
  });

  it("filtra payloads incompletos via isResident", async () => {
    mockGet.mockResolvedValue({
      data: [{ id: "r1", name: "Ana", status: "APPROVED" }, { id: "x" }],
      error: undefined,
    });
    const qc = mkClient();
    const { result } = renderHook(() => useResidents("c1"), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.residents?.map((r) => r.id)).toEqual(["r1"]);
  });

  it("expõe isError quando a chamada falha", async () => {
    mockGet.mockResolvedValue({ data: undefined, error: { message: "boom" } });
    const qc = mkClient();
    const { result } = renderHook(() => useResidents("c1"), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
