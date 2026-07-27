import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { GET: mockGet } }));

import { useBlocks } from "./useBlocks";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

afterEach(() => {
  mockGet.mockReset();
  vi.restoreAllMocks();
});

describe("useBlocks", () => {
  it("busca GET /blocks e mapeia apenas itens válidos", async () => {
    mockGet.mockResolvedValue({
      data: [
        { id: "b1", name: "Torre A", description: "Frente" },
        { id: "b2", name: "Torre B" },
        { id: "b3" }, // inválido — sem name
      ],
      error: undefined,
    });

    const { result } = renderHook(() => useBlocks("c1"), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mockGet).toHaveBeenCalledWith("/blocks");
    expect(result.current.blocks).toEqual([
      { id: "b1", name: "Torre A", description: "Frente" },
      { id: "b2", name: "Torre B" },
    ]);
  });

  it("propaga isError quando o Core falha", async () => {
    mockGet.mockResolvedValue({ data: undefined, error: { message: "boom" } });
    const { result } = renderHook(() => useBlocks("c1"), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
