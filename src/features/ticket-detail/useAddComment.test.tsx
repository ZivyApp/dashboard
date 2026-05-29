import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// expect.any() é tipado como `any` pelo vitest; tipar como unknown para
// satisfazer no-unsafe-assignment sem alterar a semântica dos matchers.
function anyFn(): unknown {
  return expect.any(Function);
}

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { POST: mockPost } }));

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

import { useAddComment } from "./useAddComment";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () => new QueryClient({ defaultOptions: { mutations: { retry: false } } });

afterEach(() => {
  mockPost.mockReset();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("useAddComment", () => {
  it("envia { text }, invalida events e mostra toast de sucesso", async () => {
    mockPost.mockResolvedValue({ data: { id: "e1" }, error: undefined });
    const qc = mkClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useAddComment("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.addComment("ok"));

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost).toHaveBeenCalledWith("/tickets/{id}/comments", {
      params: { path: { id: "t1" } },
      body: { text: "ok" },
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket-events", "t1"] });
      expect(notifySuccess).toHaveBeenCalledWith("Comentário publicado");
    });
  });

  it("em erro chama notify.error com retry", async () => {
    mockPost.mockResolvedValue({ data: undefined, error: { message: "x" } });
    const qc = mkClient();
    const { result } = renderHook(() => useAddComment("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.addComment("ok"));

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    const args = notifyError.mock.calls[0];
    expect(args?.[0]).toBe("Não foi possível publicar");
    expect(args?.[1]).toMatchObject({ retry: anyFn() });
  });
});
