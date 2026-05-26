import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { POST: mockPost } }));

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
});

describe("useAddComment", () => {
  it("envia { text } e invalida events; chama onSuccess", async () => {
    mockPost.mockResolvedValue({
      data: { id: "e9", event_type: "comment_added" },
      error: undefined,
    });
    const qc = mkClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAddComment("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.addComment("olá mundo", { onSuccess }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost).toHaveBeenCalledWith("/tickets/{id}/comments", {
      params: { path: { id: "t1" } },
      body: { text: "olá mundo" },
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket-events", "t1"] });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("expõe isError em falha", async () => {
    mockPost.mockResolvedValue({ data: undefined, error: { message: "x" } });
    const { result } = renderHook(() => useAddComment("t1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.addComment("oi"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
