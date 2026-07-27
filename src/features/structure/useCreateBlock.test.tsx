import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { anyFn } from "@/test-setup";

const { mockPost, mockSuccess, mockError } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));
vi.mock("@/api/client", () => ({ api: { POST: mockPost } }));
vi.mock("@/lib/notify", () => ({ notify: { success: mockSuccess, error: mockError } }));

import { useCreateBlock } from "./useCreateBlock";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

afterEach(() => {
  mockPost.mockReset();
  mockSuccess.mockReset();
  mockError.mockReset();
  vi.restoreAllMocks();
});

describe("useCreateBlock", () => {
  it("POST /blocks omite description ausente, faz toast e invalida a query do condo", async () => {
    mockPost.mockResolvedValue({
      data: { id: "b1", name: "Torre A" },
      error: undefined,
      response: new Response(null, { status: 201 }),
    });
    const qc = mkClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useCreateBlock("c1"), { wrapper: wrapper(qc) });
    act(() => result.current.createBlock({ name: "Torre A" }));

    await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith("Bloco criado"));
    expect(mockPost).toHaveBeenCalledWith("/blocks", { body: { name: "Torre A" } });
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["blocks", "c1"] }));
  });

  it("400 expõe formError para o banner e NÃO faz toast", async () => {
    mockPost.mockResolvedValue({
      data: undefined,
      error: { name: "Nome é obrigatório" },
      response: new Response(null, { status: 400 }),
    });
    const { result } = renderHook(() => useCreateBlock("c1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.createBlock({ name: "" }));

    await waitFor(() => expect(result.current.formError).toBe("Nome é obrigatório"));
    expect(mockError).not.toHaveBeenCalled();
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it("erro não-400 faz toast com retry e NÃO expõe formError", async () => {
    mockPost.mockResolvedValue({
      data: undefined,
      error: { message: "boom" },
      response: new Response(null, { status: 500 }),
    });
    const { result } = renderHook(() => useCreateBlock("c1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.createBlock({ name: "Torre A" }));

    await waitFor(() =>
      expect(mockError).toHaveBeenCalledWith(
        "Não foi possível criar o bloco",
        expect.objectContaining({ retry: anyFn() }),
      ),
    );
    // Banner + toast duplicariam a mensagem — não-400 fica só no toast.
    expect(result.current.formError).toBeNull();
  });
});
