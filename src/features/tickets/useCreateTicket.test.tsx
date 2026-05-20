import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { POST: mockPost } }));

import { useCreateTicket } from "./useCreateTicket";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () => new QueryClient({ defaultOptions: { mutations: { retry: false } } });

const VALID_INPUT = {
  title: "Vazamento",
  resident_id: "r1",
  priority: "high" as const,
  location: "common_area" as const,
  location_ref: "Garagem",
};

afterEach(() => {
  mockPost.mockReset();
  vi.restoreAllMocks();
});

describe("useCreateTicket", () => {
  it("no sucesso devolve o ticket e invalida a query de tickets", async () => {
    mockPost.mockResolvedValue({
      data: {
        id: "t1",
        protocol: "TKT-1",
        title: "Vazamento",
        status: "open",
        priority: "high",
        updated_at: "2026-05-20T00:00:00Z",
      },
      error: undefined,
      response: { status: 201 },
    });
    const qc = mkClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useCreateTicket("c1"), { wrapper: wrapper(qc) });

    act(() => {
      result.current.create(VALID_INPUT);
    });

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost).toHaveBeenCalledWith("/tickets", {
      body: {
        title: "Vazamento",
        resident_id: "r1",
        priority: "high",
        location: "common_area",
        location_ref: "Garagem",
      },
    });
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tickets", "c1"] }));
  });

  it("inclui description quando presente", async () => {
    mockPost.mockResolvedValue({
      data: {
        id: "t1",
        protocol: "TKT-1",
        title: "Vazamento",
        status: "open",
        priority: "high",
        updated_at: "2026-05-20T00:00:00Z",
      },
      error: undefined,
      response: { status: 201 },
    });
    const qc = mkClient();
    const { result } = renderHook(() => useCreateTicket("c1"), { wrapper: wrapper(qc) });
    act(() => {
      result.current.create({ ...VALID_INPUT, description: "detalhe" });
    });
    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost.mock.calls[0]?.[1]).toEqual({
      body: {
        title: "Vazamento",
        resident_id: "r1",
        priority: "high",
        location: "common_area",
        location_ref: "Garagem",
        description: "detalhe",
      },
    });
  });

  it("mapeia 400 { campo: msg } para fieldErrors", async () => {
    mockPost.mockResolvedValue({
      data: undefined,
      error: { title: "obrigatório" },
      response: { status: 400 },
    });
    const qc = mkClient();
    const { result } = renderHook(() => useCreateTicket("c1"), { wrapper: wrapper(qc) });
    act(() => {
      result.current.create(VALID_INPUT);
    });
    await waitFor(() => expect(result.current.fieldErrors).toEqual({ title: "obrigatório" }));
  });

  it("erro sem field map vira generalError", async () => {
    mockPost.mockResolvedValue({
      data: undefined,
      error: { message: "x" },
      response: { status: 500 },
    });
    const qc = mkClient();
    const { result } = renderHook(() => useCreateTicket("c1"), { wrapper: wrapper(qc) });
    act(() => {
      result.current.create(VALID_INPUT);
    });
    await waitFor(() => expect(result.current.generalError).toContain("500"));
    expect(result.current.fieldErrors).toEqual({});
  });

  it("400 genérico { message } vira generalError, não fieldErrors órfão", async () => {
    mockPost.mockResolvedValue({
      data: undefined,
      error: { message: "Dados inválidos" },
      response: { status: 400 },
    });
    const qc = mkClient();
    const { result } = renderHook(() => useCreateTicket("c1"), { wrapper: wrapper(qc) });
    act(() => {
      result.current.create(VALID_INPUT);
    });
    await waitFor(() => expect(result.current.generalError).toBe("Dados inválidos"));
    expect(result.current.fieldErrors).toEqual({});
  });

  it("400 misto: campo conhecido inline, chave desconhecida no banner", async () => {
    mockPost.mockResolvedValue({
      data: undefined,
      error: { title: "obrigatório", detail: "contexto extra" },
      response: { status: 400 },
    });
    const qc = mkClient();
    const { result } = renderHook(() => useCreateTicket("c1"), { wrapper: wrapper(qc) });
    act(() => {
      result.current.create(VALID_INPUT);
    });
    await waitFor(() => expect(result.current.fieldErrors).toEqual({ title: "obrigatório" }));
    expect(result.current.generalError).toBe("contexto extra");
  });

  it("403 expõe mensagem de permissão em generalError", async () => {
    mockPost.mockResolvedValue({
      data: undefined,
      error: { message: "forbidden" },
      response: { status: 403 },
    });
    const qc = mkClient();
    const { result } = renderHook(() => useCreateTicket("c1"), { wrapper: wrapper(qc) });
    act(() => {
      result.current.create(VALID_INPUT);
    });
    await waitFor(() =>
      expect(result.current.generalError).toBe(
        "Sem permissão para criar chamados neste condomínio.",
      ),
    );
    expect(result.current.fieldErrors).toEqual({});
  });
});
