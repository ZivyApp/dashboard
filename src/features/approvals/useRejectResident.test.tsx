import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPatch } = vi.hoisted(() => ({ mockPatch: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { PATCH: mockPatch } }));

import { useRejectResident } from "./useRejectResident";

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

describe("useRejectResident", () => {
  it("chama PATCH /residents/{id}/reject com X-Condo-ID e invalida a query do condo", async () => {
    mockPatch.mockResolvedValue({ data: { id: "r1", status: "INACTIVE" }, error: undefined });
    const qc = mkClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useRejectResident(), { wrapper: wrapper(qc) });
    act(() => result.current.reject({ id: "r1", condoId: "c1" }));

    await waitFor(() => expect(mockPatch).toHaveBeenCalled());
    expect(mockPatch).toHaveBeenCalledWith("/residents/{id}/reject", {
      params: { path: { id: "r1" } },
      headers: { "X-Condo-ID": "c1" },
    });
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["residents", "c1"] }));
  });
});
