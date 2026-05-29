import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { GET: mockGet } }));

import { useCondoManagers } from "./useCondoManagers";

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

describe("useCondoManagers", () => {
  it("mapeia itens válidos e deriva label email-first", async () => {
    mockGet.mockResolvedValue({
      data: [
        { user_id: "u1", email: "ana@ex.com", name: "Ana", role: "manager" },
        { user_id: "u2", email: "bob@ex.com", name: "", role: "staff" },
      ],
      error: undefined,
    });
    const { result } = renderHook(() => useCondoManagers("c1"), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/condos/{id}/managers", {
      params: { path: { id: "c1" } },
    });
    expect(result.current.data?.[0]).toEqual({
      userId: "u1",
      email: "ana@ex.com",
      name: "Ana",
      role: "manager",
      label: "Ana",
    });
    expect(result.current.data?.[1]?.label).toBe("bob@ex.com"); // name vazio → email
  });

  it("descarta itens com role desconhecida", async () => {
    mockGet.mockResolvedValue({
      data: [{ user_id: "u1", email: "a@x.com", name: "A", role: "alien" }],
      error: undefined,
    });
    const { result } = renderHook(() => useCondoManagers("c1"), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });
});
