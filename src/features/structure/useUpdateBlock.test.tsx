import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPatch, mockSuccess, mockError } = vi.hoisted(() => ({
  mockPatch: vi.fn(),
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));
vi.mock("@/api/client", () => ({ api: { PATCH: mockPatch } }));
vi.mock("@/lib/notify", () => ({ notify: { success: mockSuccess, error: mockError } }));

import { useUpdateBlock } from "./useUpdateBlock";

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

describe("useUpdateBlock", () => {
  it("PATCH /blocks/{id} envia description vazia para limpar o campo", async () => {
    mockPatch.mockResolvedValue({
      data: { id: "b1", name: "Torre A" },
      error: undefined,
      response: new Response(null, { status: 200 }),
    });
    const qc = mkClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useUpdateBlock("c1"), { wrapper: wrapper(qc) });
    act(() => result.current.updateBlock({ id: "b1", name: "Torre A", description: "" }));

    await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith("Bloco atualizado"));
    expect(mockPatch).toHaveBeenCalledWith("/blocks/{id}", {
      params: { path: { id: "b1" } },
      body: { name: "Torre A", description: "" },
    });
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["blocks", "c1"] }));
  });

  it("400 expõe formError sem toast", async () => {
    mockPatch.mockResolvedValue({
      data: undefined,
      error: { name: "Nome é obrigatório" },
      response: new Response(null, { status: 400 }),
    });
    const { result } = renderHook(() => useUpdateBlock("c1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.updateBlock({ id: "b1", name: "", description: "" }));

    await waitFor(() => expect(result.current.formError).toBe("Nome é obrigatório"));
    expect(mockError).not.toHaveBeenCalled();
  });
});
