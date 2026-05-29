import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { anyFn } from "@/test-setup";

const { mockPatch } = vi.hoisted(() => ({ mockPatch: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { PATCH: mockPatch } }));

const { notifySuccess, notifyError } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock("@/lib/notify", () => ({
  notify: {
    success: notifySuccess,
    error: notifyError,
    deferred: vi.fn(),
    commitNow: vi.fn(),
    cancel: vi.fn(),
  },
}));

import { useAssignTo } from "./useAssignTo";
import type { CondoManager } from "./useCondoManagers";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = (managers: CondoManager[] = []) => {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  qc.setQueryData(["condo-managers", "c1"], managers);
  return qc;
};

afterEach(() => {
  mockPatch.mockReset();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("useAssignTo", () => {
  it("envia { assignee_id }, invalida e mostra toast com nome resolvido", async () => {
    mockPatch.mockResolvedValue({ data: { id: "t1" }, error: undefined });
    const qc = mkClient([
      {
        userId: "u9",
        name: "Ana Silva",
        email: "ana@zivy.local",
        role: "manager",
        label: "Ana Silva",
      },
    ]);
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useAssignTo("t1", "c1"), { wrapper: wrapper(qc) });

    act(() => result.current.assignTo("u9"));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    expect(mockPatch).toHaveBeenCalledWith("/tickets/{id}/assign-to", {
      params: { path: { id: "t1" } },
      body: { assignee_id: "u9" },
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket", "t1"] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket-events", "t1"] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tickets"] });
      expect(notifySuccess).toHaveBeenCalledWith("Atribuído a Ana Silva");
    });
  });

  it("toast usa label (email-first) do manager", async () => {
    mockPatch.mockResolvedValue({ data: { id: "t1" }, error: undefined });
    const qc = mkClient([
      {
        userId: "u9",
        name: "",
        email: "ana@zivy.local",
        role: "manager",
        label: "ana@zivy.local",
      },
    ]);
    const { result } = renderHook(() => useAssignTo("t1", "c1"), { wrapper: wrapper(qc) });

    act(() => result.current.assignTo("u9"));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith("Atribuído a ana@zivy.local"));
  });

  it("em erro chama notify.error com retry", async () => {
    mockPatch.mockResolvedValue({ data: undefined, error: { message: "x" } });
    const qc = mkClient();
    const { result } = renderHook(() => useAssignTo("t1", "c1"), { wrapper: wrapper(qc) });

    act(() => result.current.assignTo("u9"));

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    const args = notifyError.mock.calls[0];
    expect(args?.[0]).toBe("Não foi possível atribuir");
    expect(args?.[1]).toMatchObject({ retry: anyFn() });
  });
});
