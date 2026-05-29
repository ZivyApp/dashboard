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

import { useClaimTicket } from "./useClaimTicket";

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

describe("useClaimTicket", () => {
  it("chama assign sem body e invalida ticket/events/tickets; toast de sucesso", async () => {
    mockPatch.mockResolvedValue({ data: { id: "t1" }, error: undefined });
    const qc = mkClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useClaimTicket("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.claim());

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    expect(mockPatch).toHaveBeenCalledWith("/tickets/{id}/assign", {
      params: { path: { id: "t1" } },
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket", "t1"] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket-events", "t1"] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tickets"] });
      expect(notifySuccess).toHaveBeenCalledWith("Você assumiu o chamado");
    });
  });

  it("em erro chama notify.error com retry", async () => {
    mockPatch.mockResolvedValue({ data: undefined, error: { message: "x" } });
    const qc = mkClient();
    const { result } = renderHook(() => useClaimTicket("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.claim());

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    const args = notifyError.mock.calls[0];
    expect(args?.[0]).toBe("Não foi possível assumir");
    expect(args?.[1]).toMatchObject({ retry: anyFn() });
  });
});
