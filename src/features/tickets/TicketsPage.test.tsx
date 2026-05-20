import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Ticket } from "@/types/ticket";

const { mockUseTickets, mockUseExportTickets, mockUseMyCondos, mockNavigate } = vi.hoisted(() => ({
  mockUseTickets: vi.fn(),
  mockUseExportTickets: vi.fn(),
  mockUseMyCondos: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock("./useTickets", () => ({ useTickets: mockUseTickets }));
vi.mock("./useExportTickets", () => ({ useExportTickets: mockUseExportTickets }));
vi.mock("@/features/condo/useMyCondos", () => ({ useMyCondos: mockUseMyCondos }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

import { TicketsPage } from "./TicketsPage";
import { useTicketsView } from "./viewModeStore";

const mkTicket = (id: string, status: Ticket["status"] = "open"): Ticket => ({
  id,
  protocol: `TKT-${id}`,
  title: `Ticket ${id}`,
  status,
  priority: "medium",
  updated_at: "2026-05-14T12:00:00Z",
});

function setupTickets(tickets: Ticket[]) {
  mockUseTickets.mockReturnValue({
    data: tickets,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  });
}

function setupRole(role: string | undefined) {
  mockUseMyCondos.mockReturnValue({
    data: role ? [{ condoId: "c1", role }] : [],
  });
}

beforeEach(() => {
  mockUseTickets.mockReset();
  mockUseExportTickets.mockReset();
  mockUseMyCondos.mockReset();
  mockNavigate.mockReset();
  mockUseExportTickets.mockReturnValue({
    exportTickets: vi.fn(),
    isLoading: false,
    error: null,
  });
  try {
    localStorage.removeItem("zivy-tickets-view");
  } catch {
    /* noop */
  }
  useTicketsView.setState({ mode: "table" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TicketsPage", () => {
  it("renderiza h1 e subtítulo com count", () => {
    setupTickets([mkTicket("1"), mkTicket("2", "in_progress")]);
    setupRole("viewer");

    render(<TicketsPage condoId="c1" />);

    expect(screen.getByRole("heading", { name: /^tickets$/i })).toBeInTheDocument();
    expect(screen.getByText(/2 chamados · ordenados por prioridade/i)).toBeInTheDocument();
  });

  it("usa singular quando 1 chamado", () => {
    setupTickets([mkTicket("1")]);
    setupRole("viewer");
    render(<TicketsPage condoId="c1" />);
    expect(screen.getByText(/1 chamado · ordenados/i)).toBeInTheDocument();
  });

  it("mostra Spinner enquanto isPending", () => {
    mockUseTickets.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      refetch: vi.fn(),
    });
    setupRole("viewer");
    render(<TicketsPage condoId="c1" />);
    expect(screen.getByRole("status", { name: /carregando/i })).toBeInTheDocument();
  });

  it("mostra retry quando isError", async () => {
    const refetch = vi.fn();
    mockUseTickets.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      refetch,
    });
    setupRole("viewer");
    render(<TicketsPage condoId="c1" />);

    await userEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("renderiza tabela por default (mode='table')", () => {
    setupTickets([mkTicket("1")]);
    setupRole("viewer");
    render(<TicketsPage condoId="c1" />);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renderiza Kanban quando mode='kanban' no store", () => {
    useTicketsView.setState({ mode: "kanban" });
    setupTickets([mkTicket("1")]);
    setupRole("viewer");
    render(<TicketsPage condoId="c1" />);
    expect(screen.getAllByRole("region")).toHaveLength(4);
  });

  it("mostra 'Exportar CSV' para manager e chama exportTickets no click", async () => {
    const exportTickets = vi.fn();
    mockUseExportTickets.mockReturnValue({ exportTickets, isLoading: false, error: null });
    setupTickets([mkTicket("1")]);
    setupRole("manager");
    render(<TicketsPage condoId="c1" />);

    const btn = screen.getByRole("button", { name: /exportar csv/i });
    await userEvent.click(btn);
    expect(exportTickets).toHaveBeenCalled();
  });

  it("esconde 'Exportar CSV' para viewer", () => {
    setupTickets([mkTicket("1")]);
    setupRole("viewer");
    render(<TicketsPage condoId="c1" />);
    expect(screen.queryByRole("button", { name: /exportar csv/i })).not.toBeInTheDocument();
  });

  it("mostra 'Novo chamado' para staff e navega ao clicar", async () => {
    setupTickets([mkTicket("1")]);
    setupRole("staff");
    render(<TicketsPage condoId="c1" />);

    await userEvent.click(screen.getByRole("button", { name: /novo chamado/i }));
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/c/$condoId/tickets/new",
      params: { condoId: "c1" },
    });
  });

  it("esconde 'Novo chamado' para viewer", () => {
    setupTickets([mkTicket("1")]);
    setupRole("viewer");
    render(<TicketsPage condoId="c1" />);
    expect(screen.queryByRole("button", { name: /novo chamado/i })).not.toBeInTheDocument();
  });

  it("EmptyState quando lista filtrada é vazia", () => {
    setupTickets([]);
    setupRole("viewer");
    render(<TicketsPage condoId="c1" />);
    expect(screen.getByText(/nada por aqui/i)).toBeInTheDocument();
  });

  it("mostra exportError quando hook retorna erro", () => {
    mockUseExportTickets.mockReturnValue({
      exportTickets: vi.fn(),
      isLoading: false,
      error: "Falha ao exportar (cap)",
    });
    setupTickets([mkTicket("1")]);
    setupRole("manager");
    render(<TicketsPage condoId="c1" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/falha ao exportar/i);
  });
});
