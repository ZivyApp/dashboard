import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { CondoMembership } from "@/features/condo/useMyCondos";
import type { Ticket } from "@/types/ticket";

const { mockUseMyCondos, mockUseTickets, mockNavigate } = vi.hoisted(() => ({
  mockUseMyCondos: vi.fn(),
  mockUseTickets: vi.fn(),
  mockNavigate: vi.fn(),
}));
vi.mock("@/features/condo/useMyCondos", () => ({ useMyCondos: mockUseMyCondos }));
vi.mock("@/features/tickets/useTickets", () => ({ useTickets: mockUseTickets }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mockNavigate }));

import { CondoOverviewPage } from "./CondoOverviewPage";

function mkTicket(over: Partial<Ticket>): Ticket {
  return {
    id: "t",
    protocol: "TKT-1",
    title: "Chamado",
    status: "open",
    priority: "high",
    updated_at: "2026-05-20T00:00:00Z",
    ...over,
  };
}
const condo = (id: string, name: string): CondoMembership => ({
  condoId: id,
  condoName: name,
  condoSlug: id,
  role: "manager",
});

afterEach(() => {
  vi.restoreAllMocks();
  mockUseMyCondos.mockReset();
  mockUseTickets.mockReset();
  mockNavigate.mockReset();
});

describe("CondoOverviewPage", () => {
  it("título com nome do condo, KPIs do condo e sem coluna Condomínio", () => {
    mockUseMyCondos.mockReturnValue({ data: [condo("c1", "Solar")] });
    mockUseTickets.mockReturnValue({
      data: [mkTicket({ id: "a", status: "open" }), mkTicket({ id: "b", status: "resolved" })],
      isPending: false,
      isError: false,
    });

    render(<CondoOverviewPage condoId="c1" />);
    expect(screen.getByRole("heading", { name: "Solar" })).toBeInTheDocument();
    expect(screen.queryByText("Condomínio")).not.toBeInTheDocument();
    // 1 open
    expect(screen.getByText("Abertos").parentElement).toHaveTextContent("1");
  });

  it("'Ver chamados' navega para os tickets do condo", () => {
    mockUseMyCondos.mockReturnValue({ data: [condo("c1", "Solar")] });
    mockUseTickets.mockReturnValue({ data: [], isPending: false, isError: false });

    render(<CondoOverviewPage condoId="c1" />);
    fireEvent.click(screen.getByRole("button", { name: /ver chamados/i }));
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/c/$condoId/tickets",
      params: { condoId: "c1" },
    });
  });

  it("clique numa linha abre o detalhe do ticket no condo", () => {
    mockUseMyCondos.mockReturnValue({ data: [condo("c1", "Solar")] });
    mockUseTickets.mockReturnValue({
      data: [mkTicket({ id: "x1", title: "Vazamento" })],
      isPending: false,
      isError: false,
    });

    render(<CondoOverviewPage condoId="c1" />);
    fireEvent.click(screen.getByRole("button", { name: /vazamento/i }));
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/c/$condoId/tickets/$ticketId",
      params: { condoId: "c1", ticketId: "x1" },
    });
  });
});
