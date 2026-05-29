import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// expect.any() é tipado como `any` pelo vitest; tipar como unknown para
// satisfazer no-unsafe-assignment sem alterar a semântica dos matchers.
function anyFn(): unknown {
  return expect.any(Function);
}

const { mockPatch } = vi.hoisted(() => ({ mockPatch: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { PATCH: mockPatch } }));

const { notifyDeferred, notifyError } = vi.hoisted(() => ({
  notifyDeferred:
    vi.fn<
      (
        id: string,
        message: string,
        opts: { delayMs: number; onCommit: () => void; onUndo?: () => void },
      ) => void
    >(),
  notifyError: vi.fn(),
}));
vi.mock("@/lib/notify", () => ({
  notify: {
    deferred: notifyDeferred,
    cancel: vi.fn(),
    commitNow: vi.fn(),
    success: vi.fn(),
    error: notifyError,
  },
}));

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
  vi.clearAllMocks();
});

describe("useUpdateStatus", () => {
  it("updateStatus agenda notify.deferred com id, mensagem, delay 5000 e onCommit/onUndo", () => {
    const qc = mkClient();
    const { result } = renderHook(() => useUpdateStatus("t1"), { wrapper: wrapper(qc) });
    act(() => result.current.updateStatus("resolved"));
    expect(notifyDeferred).toHaveBeenCalledWith(
      "ticket-status-t1",
      "Status alterado para Resolvido",
      expect.objectContaining({
        delayMs: 5000,
        onCommit: anyFn(),
        onUndo: anyFn(),
      }),
    );
  });

  it("marca pendingStatus imediatamente sem tocar o cache do ticket", () => {
    const qc = mkClient();
    const { result } = renderHook(() => useUpdateStatus("t1"), { wrapper: wrapper(qc) });
    act(() => result.current.updateStatus("resolved"));
    expect(result.current.pendingStatus).toBe("resolved");
    expect(qc.getQueryData(["ticket", "t1"])).toBeUndefined();
  });

  it("onCommit dispara PATCH e invalida ticket/events/tickets", async () => {
    mockPatch.mockResolvedValue({ data: { ok: "true" }, error: undefined });
    const qc = mkClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useUpdateStatus("t1"), { wrapper: wrapper(qc) });
    act(() => result.current.updateStatus("resolved"));
    const onCommit = notifyDeferred.mock.calls[0]?.[2]?.onCommit;
    expect(onCommit).toBeTypeOf("function");
    act(() => onCommit?.());
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

  it("onUndo limpa pendingStatus (volta a refletir data.status)", () => {
    const qc = mkClient();
    const { result } = renderHook(() => useUpdateStatus("t1"), { wrapper: wrapper(qc) });
    act(() => result.current.updateStatus("resolved"));
    expect(result.current.pendingStatus).toBe("resolved");
    const onUndo = notifyDeferred.mock.calls[0]?.[2]?.onUndo;
    expect(onUndo).toBeTypeOf("function");
    act(() => onUndo?.());
    expect(result.current.pendingStatus).toBeUndefined();
  });

  it("erro pós-commit chama notify.error com retry e invalida ticket (rollback)", async () => {
    mockPatch.mockResolvedValue({ data: undefined, error: { message: "x" } });
    const qc = mkClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useUpdateStatus("t1"), { wrapper: wrapper(qc) });
    act(() => result.current.updateStatus("resolved"));
    const onCommit = notifyDeferred.mock.calls[0]?.[2]?.onCommit;
    act(() => onCommit?.());
    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    const errArgs = notifyError.mock.calls[0];
    expect(errArgs?.[0]).toBe("Não foi possível alterar status");
    expect(errArgs?.[1]).toMatchObject({ retry: anyFn() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket", "t1"] });
  });
});
