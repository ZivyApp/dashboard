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

import { useDeleteUnit } from "./useDeleteUnit";

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

describe("useDeleteUnit", () => {
  it("DELETE /units/{id} invalida só units (SET NULL nos residents)", async () => {
    mockDelete.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: new Response(null, { status: 204 }),
    });
    const qc = mkClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useDeleteUnit("c1"), { wrapper: wrapper(qc) });
    act(() => result.current.deleteUnit({ id: "u1" }));

    await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith("Unidade excluída"));
    expect(mockDelete).toHaveBeenCalledWith("/units/{id}", { params: { path: { id: "u1" } } });
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["units", "c1"] }));
    expect(spy).not.toHaveBeenCalledWith({ queryKey: ["blocks", "c1"] });
  });

  it("falha no delete faz toast com retry", async () => {
    mockDelete.mockResolvedValue({
      data: undefined,
      error: { message: "boom" },
      response: new Response(null, { status: 500 }),
    });
    const { result } = renderHook(() => useDeleteUnit("c1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.deleteUnit({ id: "u1" }));

    await waitFor(() =>
      expect(mockError).toHaveBeenCalledWith(
        "Não foi possível excluir a unidade",
        expect.objectContaining({ retry: anyFn() }),
      ),
    );
  });
});
