import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPatch } = vi.hoisted(() => ({ mockPatch: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { PATCH: mockPatch } }));

import { useAssignTo } from "./useAssignTo";

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

describe("useAssignTo", () => {
  it("envia { assignee_id } e invalida ticket + events; chama onSuccess", async () => {
    mockPatch.mockResolvedValue({ data: { id: "t1" }, error: undefined });
    const qc = mkClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAssignTo("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.assignTo("u9", { onSuccess }));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    expect(mockPatch).toHaveBeenCalledWith("/tickets/{id}/assign-to", {
      params: { path: { id: "t1" } },
      body: { assignee_id: "u9" },
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket", "t1"] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket-events", "t1"] });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("expõe isError em falha", async () => {
    mockPatch.mockResolvedValue({ data: undefined, error: { message: "x" } });
    const { result } = renderHook(() => useAssignTo("t1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.assignTo("u9"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
