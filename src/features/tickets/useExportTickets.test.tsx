import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.mock("@/api/authedFetch", () => ({ authedFetch: mockFetch }));

import { useExportTickets } from "./useExportTickets";

const createObjectURL = vi.fn(() => "blob:fake");
const revokeObjectURL = vi.fn();
const clickSpy = vi.fn();

beforeEach(() => {
  vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(clickSpy);
  document.body.innerHTML = "";
  mockFetch.mockReset();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  clickSpy.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useExportTickets", () => {
  it("baixa CSV em sucesso", async () => {
    const blob = new Blob(["a,b\n1,2"], { type: "text/csv" });
    mockFetch.mockResolvedValue(
      new Response(blob, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="tickets-2026-05-17.csv"',
        },
      }),
    );

    const { result } = renderHook(() => useExportTickets("c1"));
    await act(async () => {
      await result.current.exportTickets();
    });

    expect(mockFetch).toHaveBeenCalledWith("/tickets/export", { condoId: "c1" });
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it("propaga erro quando 400 (cap de linhas)", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: "export exceeds maximum of 10000 rows" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useExportTickets("c1"));
    await act(async () => {
      await result.current.exportTickets();
    });

    await waitFor(() => expect(result.current.error).toMatch(/10000/));
  });

  it("usa mensagem genérica quando body não tem error", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 500 }));

    const { result } = renderHook(() => useExportTickets("c1"));
    await act(async () => {
      await result.current.exportTickets();
    });

    await waitFor(() => expect(result.current.error).toMatch(/HTTP 500/));
  });
});
