import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { GET: mockGet } }));

import { useTicketEvents } from "./useTicketEvents";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

afterEach(() => {
  mockGet.mockReset();
  vi.restoreAllMocks();
});

describe("useTicketEvents", () => {
  it("mapeia e descarta itens inválidos", async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          id: "e1",
          ticket_id: "t1",
          event_type: "comment_added",
          actor_type: "manager",
          created_at: "2026-05-20T10:00:00Z",
          payload: { text: "oi" },
        },
        {
          id: "bad",
          ticket_id: "t1",
          event_type: "exploded",
          actor_type: "manager",
          created_at: "2026-05-20T11:00:00Z",
        },
      ],
      error: undefined,
    });
    const { result } = renderHook(() => useTicketEvents("t1"), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/tickets/{id}/events", {
      params: { path: { id: "t1" } },
    });
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.eventType).toBe("comment_added");
  });

  it("propaga erro do Core", async () => {
    mockGet.mockResolvedValue({ data: undefined, error: { message: "boom" } });
    const { result } = renderHook(() => useTicketEvents("t1"), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
