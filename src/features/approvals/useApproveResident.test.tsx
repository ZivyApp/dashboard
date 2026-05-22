import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPatch } = vi.hoisted(() => ({ mockPatch: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { PATCH: mockPatch } }));

import { useApproveResident } from "./useApproveResident";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

afterEach(() => {
  mockPatch.mockReset();
  vi.restoreAllMocks();
});

describe("useApproveResident", () => {
  it("chama PATCH /residents/{id}/approve com X-Condo-ID e invalida a query do condo", async () => {
    mockPatch.mockResolvedValue({ data: { id: "r1", status: "ACTIVE" }, error: undefined });
    const qc = mkClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useApproveResident(), { wrapper: wrapper(qc) });
    act(() => result.current.approve({ id: "r1", condoId: "c1" }));

    await waitFor(() => expect(mockPatch).toHaveBeenCalled());
    expect(mockPatch).toHaveBeenCalledWith("/residents/{id}/approve", {
      params: { path: { id: "r1" } },
      headers: { "X-Condo-ID": "c1" },
    });
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["residents", "c1"] }));
  });

  it("expõe isError quando o Core falha", async () => {
    mockPatch.mockResolvedValue({ data: undefined, error: { message: "403" } });
    const { result } = renderHook(() => useApproveResident(), { wrapper: wrapper(mkClient()) });
    act(() => result.current.approve({ id: "r1", condoId: "c1" }));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
