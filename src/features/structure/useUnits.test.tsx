import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { GET: mockGet } }));

import { useUnits } from "./useUnits";

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

describe("useUnits", () => {
  it("sem blockId: query vazia (lista tudo do condo)", async () => {
    mockGet.mockResolvedValue({
      data: [{ id: "u1", block_id: "b1", number: "101", floor: 1 }],
      error: undefined,
    });

    const { result } = renderHook(() => useUnits("c1"), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mockGet).toHaveBeenCalledWith("/units", { params: { query: {} } });
    expect(result.current.units).toEqual([{ id: "u1", blockId: "b1", number: "101", floor: 1 }]);
  });

  it("com blockId: passa o filtro via query param", async () => {
    mockGet.mockResolvedValue({ data: [], error: undefined });

    const { result } = renderHook(() => useUnits("c1", "b1"), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mockGet).toHaveBeenCalledWith("/units", { params: { query: { block_id: "b1" } } });
  });

  it("filtra itens inválidos e propaga erro", async () => {
    mockGet.mockResolvedValue({
      data: [{ id: "u1", block_id: "b1", number: "101" }, { id: "u2" }],
      error: undefined,
    });
    const { result } = renderHook(() => useUnits("c1"), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.units).toHaveLength(1);

    mockGet.mockResolvedValue({ data: undefined, error: { message: "boom" } });
    const { result: r2 } = renderHook(() => useUnits("c1", "b9"), {
      wrapper: wrapper(mkClient()),
    });
    await waitFor(() => expect(r2.current.isError).toBe(true));
  });
});
