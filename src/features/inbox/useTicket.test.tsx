import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { api } from "@/api/client";
import { useTicket } from "./useTicket";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useTicket", () => {
  it("busca o ticket por id e expõe data", async () => {
    vi.spyOn(api, "GET").mockResolvedValue({
      data: {
        id: "t1",
        protocol: "TKT-1",
        title: "x",
        status: "open",
        priority: "high",
        updated_at: "2026-05-14T00:00:00Z",
      },
      error: undefined,
    });

    const qc = mkClient();
    const { result } = renderHook(() => useTicket("t1"), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe("t1");
  });

  it("propaga erro 404", async () => {
    vi.spyOn(api, "GET").mockResolvedValue({
      data: undefined,
      error: { message: "not found" },
      response: { status: 404 } as Response,
    });

    const qc = mkClient();
    const { result } = renderHook(() => useTicket("zzz"), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
