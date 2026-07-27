import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPost, mockSuccess, mockError } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));
vi.mock("@/api/client", () => ({ api: { POST: mockPost } }));
vi.mock("@/lib/notify", () => ({ notify: { success: mockSuccess, error: mockError } }));

import { useCreateUnit } from "./useCreateUnit";

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

describe("useCreateUnit", () => {
  it("POST /units envia block_id no body e omite floor ausente", async () => {
    mockPost.mockResolvedValue({
      data: { id: "u1", block_id: "b1", number: "101" },
      error: undefined,
      response: new Response(null, { status: 201 }),
    });
    const qc = mkClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useCreateUnit("c1"), { wrapper: wrapper(qc) });
    act(() => result.current.createUnit({ blockId: "b1", number: "101" }));

    await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith("Unidade criada"));
    expect(mockPost).toHaveBeenCalledWith("/units", {
      body: { block_id: "b1", number: "101" },
    });
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["units", "c1"] }));
  });

  it("envia floor quando informado", async () => {
    mockPost.mockResolvedValue({
      data: { id: "u1", block_id: "b1", number: "203", floor: 2 },
      error: undefined,
      response: new Response(null, { status: 201 }),
    });
    const { result } = renderHook(() => useCreateUnit("c1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.createUnit({ blockId: "b1", number: "203", floor: 2 }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/units", {
        body: { block_id: "b1", number: "203", floor: 2 },
      }),
    );
  });

  it("400 expõe formError sem toast", async () => {
    mockPost.mockResolvedValue({
      data: undefined,
      error: { number: "Número já existe neste bloco" },
      response: new Response(null, { status: 400 }),
    });
    const { result } = renderHook(() => useCreateUnit("c1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.createUnit({ blockId: "b1", number: "101" }));

    await waitFor(() => expect(result.current.formError).toBe("Número já existe neste bloco"));
    expect(mockError).not.toHaveBeenCalled();
  });
});
