import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { anyFn } from "@/test-setup";

const { mockDelete, mockSuccess, mockError } = vi.hoisted(() => ({
  mockDelete: vi.fn(),
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));
vi.mock("@/api/client", () => ({ api: { DELETE: mockDelete } }));
vi.mock("@/lib/notify", () => ({ notify: { success: mockSuccess, error: mockError } }));

import { useDeleteBlock } from "./useDeleteBlock";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

afterEach(() => {
  mockDelete.mockReset();
  mockSuccess.mockReset();
  mockError.mockReset();
  vi.restoreAllMocks();
});

describe("useDeleteBlock", () => {
  it("DELETE /blocks/{id} invalida blocks E units (CASCADE no Core)", async () => {
    mockDelete.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: new Response(null, { status: 204 }),
    });
    const qc = mkClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useDeleteBlock("c1"), { wrapper: wrapper(qc) });
    act(() => result.current.deleteBlock({ id: "b1" }));

    await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith("Bloco excluído"));
    expect(mockDelete).toHaveBeenCalledWith("/blocks/{id}", { params: { path: { id: "b1" } } });
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["blocks", "c1"] }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["units", "c1"] }));
  });

  it("falha no delete faz toast com retry (sem exceção de 400)", async () => {
    mockDelete.mockResolvedValue({
      data: undefined,
      error: { message: "boom" },
      response: new Response(null, { status: 500 }),
    });
    const { result } = renderHook(() => useDeleteBlock("c1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.deleteBlock({ id: "b1" }));

    await waitFor(() =>
      expect(mockError).toHaveBeenCalledWith(
        "Não foi possível excluir o bloco",
        expect.objectContaining({ retry: anyFn() }),
      ),
    );
  });
});
