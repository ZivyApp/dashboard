import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { anyFn } from "@/test-setup";

const { mockPatch, mockSuccess, mockError } = vi.hoisted(() => ({
  mockPatch: vi.fn(),
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));
vi.mock("@/api/client", () => ({ api: { PATCH: mockPatch } }));
vi.mock("@/lib/notify", () => ({ notify: { success: mockSuccess, error: mockError } }));

import { useUpdateUnit } from "./useUpdateUnit";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

afterEach(() => {
  mockPatch.mockReset();
  mockSuccess.mockReset();
  mockError.mockReset();
  vi.restoreAllMocks();
});

describe("useUpdateUnit", () => {
  it("PATCH /units/{id} envia number+floor e NUNCA block_id", async () => {
    mockPatch.mockResolvedValue({
      data: { id: "u1", block_id: "b1", number: "204", floor: 2 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    });
    const qc = mkClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useUpdateUnit("c1"), { wrapper: wrapper(qc) });
    act(() => result.current.updateUnit({ id: "u1", number: "204", floor: 2 }));

    await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith("Unidade atualizada"));
    expect(mockPatch).toHaveBeenCalledWith("/units/{id}", {
      params: { path: { id: "u1" } },
      body: { number: "204", floor: 2 },
    });
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["units", "c1"] }));
  });

  it("omite floor quando não informado (não limpa o valor no Core)", async () => {
    mockPatch.mockResolvedValue({
      data: { id: "u1", block_id: "b1", number: "204", floor: 2 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    });
    const { result } = renderHook(() => useUpdateUnit("c1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.updateUnit({ id: "u1", number: "204" }));

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith("/units/{id}", {
        params: { path: { id: "u1" } },
        body: { number: "204" },
      }),
    );
  });

  it("erro não-400 faz toast com retry e NÃO expõe formError", async () => {
    mockPatch.mockResolvedValue({
      data: undefined,
      error: { message: "boom" },
      response: new Response(null, { status: 500 }),
    });
    const { result } = renderHook(() => useUpdateUnit("c1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.updateUnit({ id: "u1", number: "204" }));

    await waitFor(() =>
      expect(mockError).toHaveBeenCalledWith(
        "Não foi possível atualizar a unidade",
        expect.objectContaining({ retry: anyFn() }),
      ),
    );
    expect(result.current.formError).toBeNull();
  });
});
