import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { CondoMembership } from "@/features/condo/useMyCondos";
import type { CondoTickets } from "@/features/tickets/useTicketsScoped";
import type { Ticket } from "@/types/ticket";

const { mockUseMyCondos, mockUseTicketsScoped, mockNavigate, mockSetLastSelected } = vi.hoisted(
  () => ({
    mockUseMyCondos: vi.fn(),
    mockUseTicketsScoped: vi.fn(),
    mockNavigate: vi.fn(),
    mockSetLastSelected: vi.fn(),
  }),
);
vi.mock("@/features/condo/useMyCondos", () => ({ useMyCondos: mockUseMyCondos }));
vi.mock("@/features/tickets/useTicketsScoped", () => ({ useTicketsScoped: mockUseTicketsScoped }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mockNavigate }));
vi.mock("@/stores/activeCondo", () => ({ setLastSelected: mockSetLastSelected }));

import { OverviewPage } from "./OverviewPage";

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
  mockUseTicketsScoped.mockReset();
  mockNavigate.mockReset();
  mockSetLastSelected.mockReset();
});

describe("OverviewPage", () => {
  it("multi-condo: título 'Visão geral', grid e KPIs agregados", () => {
    const byCondo: CondoTickets[] = [
      { condo: condo("c1", "Solar"), tickets: [mkTicket({ id: "a", status: "open" })] },
      { condo: condo("c2", "Vista"), tickets: [mkTicket({ id: "b", status: "resolved" })] },
    ];
    mockUseMyCondos.mockReturnValue({ data: byCondo.map((c) => c.condo) });
    mockUseTicketsScoped.mockReturnValue({ byCondo, isPending: false, isError: false });

    render(<OverviewPage />);
    expect(screen.getByRole("heading", { name: "Visão geral" })).toBeInTheDocument();
    expect(screen.getByText("Condomínios")).toBeInTheDocument();
    // 1 open agregado — KpiRow renderiza antes do grid; pega o primeiro "Abertos"
    expect(screen.getAllByText("Abertos")[0]?.parentElement).toHaveTextContent("1");
  });

  it("condo único: título com nome do condo e sem grid", () => {
    const byCondo: CondoTickets[] = [{ condo: condo("c1", "Solar"), tickets: [mkTicket({})] }];
    mockUseMyCondos.mockReturnValue({ data: byCondo.map((c) => c.condo) });
    mockUseTicketsScoped.mockReturnValue({ byCondo, isPending: false, isError: false });

    render(<OverviewPage />);
    expect(screen.getByRole("heading", { name: "Solar" })).toBeInTheDocument();
    expect(screen.queryByText("Condomínios")).not.toBeInTheDocument();
  });

  it("clique no condo card foca e navega para /c/<id>/inbox", () => {
    const byCondo: CondoTickets[] = [
      { condo: condo("c1", "Solar"), tickets: [] },
      { condo: condo("c2", "Vista"), tickets: [] },
    ];
    mockUseMyCondos.mockReturnValue({ data: byCondo.map((c) => c.condo) });
    mockUseTicketsScoped.mockReturnValue({ byCondo, isPending: false, isError: false });

    render(<OverviewPage />);
    fireEvent.click(screen.getByRole("button", { name: /vista/i }));
    expect(mockSetLastSelected).toHaveBeenCalledWith("c2");
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/c/$condoId/inbox",
      params: { condoId: "c2" },
    });
  });
});
