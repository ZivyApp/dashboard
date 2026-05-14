import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InboxPage } from "./InboxPage";
import * as inboxQuery from "./useInboxTickets";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

const mkTicket = (over: Partial<{ id: string; title: string; protocol: string }> = {}) => ({
  id: over.id ?? "t1",
  protocol: over.protocol ?? "TKT-2026-001",
  title: over.title ?? "Elevador parado",
  status: "open" as const,
  priority: "high" as const,
  updated_at: "2026-05-14T00:00:00Z",
});

afterEach(() => {
  vi.restoreAllMocks();
  mockNavigate.mockReset();
});

describe("InboxPage", () => {
  it("mostra skeleton em loading", () => {
    vi.spyOn(inboxQuery, "useInboxTickets").mockReturnValue({
      data: undefined,
      isPending: true,
      isFetching: true,
      isError: false,
      isSuccess: false,
      error: undefined,
      refetch: () => {},
    });
    render(<InboxPage condoId="c1" />);
    expect(screen.getByLabelText(/carregando/i)).toBeInTheDocument();
  });

  it("mostra empty 'Tudo em dia' quando não há tickets nem filtros", () => {
    vi.spyOn(inboxQuery, "useInboxTickets").mockReturnValue({
      data: [],
      isPending: false,
      isFetching: false,
      isError: false,
      isSuccess: true,
      error: undefined,
      refetch: () => {},
    });
    render(<InboxPage condoId="c1" />);
    expect(screen.getByText(/tudo em dia/i)).toBeInTheDocument();
  });

  it("mostra empty 'Nenhum chamado' quando filtros não retornam nada", async () => {
    vi.spyOn(inboxQuery, "useInboxTickets").mockReturnValue({
      data: [mkTicket({ title: "Elevador" })],
      isPending: false,
      isFetching: false,
      isError: false,
      isSuccess: true,
      error: undefined,
      refetch: () => {},
    });
    render(<InboxPage condoId="c1" />);
    await userEvent.type(screen.getByPlaceholderText(/buscar/i), "vazamento");
    expect(screen.getByText(/nenhum chamado/i)).toBeInTheDocument();
  });

  it("mostra erro com botão tentar novamente", async () => {
    const refetch = vi.fn();
    vi.spyOn(inboxQuery, "useInboxTickets").mockReturnValue({
      data: undefined,
      isPending: false,
      isFetching: false,
      isError: true,
      isSuccess: false,
      error: new Error("boom"),
      refetch,
    });
    render(<InboxPage condoId="c1" />);
    expect(screen.getByText(/não foi possível carregar/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("renderiza lista de tickets e click chama navigate", async () => {
    vi.spyOn(inboxQuery, "useInboxTickets").mockReturnValue({
      data: [mkTicket({ id: "t1", title: "Elevador" })],
      isPending: false,
      isFetching: false,
      isError: false,
      isSuccess: true,
      error: undefined,
      refetch: () => {},
    });
    render(<InboxPage condoId="c1" />);
    const matches = screen.getAllByText("Elevador");
    expect(matches.length).toBeGreaterThan(0);
    const row = matches.map((el) => el.closest("tr")).find((tr) => tr !== null);
    await userEvent.click(row as HTMLElement);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/c/$condoId/inbox/$ticketId",
      params: { condoId: "c1", ticketId: "t1" },
    });
  });
});
