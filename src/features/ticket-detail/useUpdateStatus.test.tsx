import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPatch } = vi.hoisted(() => ({ mockPatch: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { PATCH: mockPatch } }));

import { useUpdateStatus } from "./useUpdateStatus";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () => new QueryClient({ defaultOptions: { mutations: { retry: false } } });

afterEach(() => {
  mockPatch.mockReset();
  vi.restoreAllMocks();
});

describe("useUpdateStatus", () => {
  it("envia { status } e invalida ticket + events", async () => {
    mockPatch.mockResolvedValue({ data: { ok: "true" }, error: undefined });
    const qc = mkClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useUpdateStatus("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.updateStatus("resolved"));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    expect(mockPatch).toHaveBeenCalledWith("/tickets/{id}/status", {
      params: { path: { id: "t1" } },
      body: { status: "resolved" },
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket", "t1"] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket-events", "t1"] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tickets"] });
    });
  });

  it("expõe isError em falha", async () => {
    mockPatch.mockResolvedValue({ data: undefined, error: { message: "x" } });
    const { result } = renderHook(() => useUpdateStatus("t1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.updateStatus("closed"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
