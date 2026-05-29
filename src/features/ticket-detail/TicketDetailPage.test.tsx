import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  mockUseTicket,
  mockUseTicketEvents,
  mockUseUpdateStatus,
  mockUseClaim,
  mockUseAssignTo,
  mockUseCondoManagers,
  mockUseAddComment,
  mockUseCanManage,
  mockUseSession,
} = vi.hoisted(() => ({
  mockUseTicket: vi.fn(),
  mockUseTicketEvents: vi.fn(),
  mockUseUpdateStatus: vi.fn(),
  mockUseClaim: vi.fn(),
  mockUseAssignTo: vi.fn(),
  mockUseCondoManagers: vi.fn(),
  mockUseAddComment: vi.fn(),
  mockUseCanManage: vi.fn(),
  mockUseSession: vi.fn(),
}));
vi.mock("@/features/tickets/useTicket", () => ({ useTicket: mockUseTicket }));
vi.mock("./useTicketEvents", () => ({ useTicketEvents: mockUseTicketEvents }));
vi.mock("./useUpdateStatus", () => ({ useUpdateStatus: mockUseUpdateStatus }));
vi.mock("./useClaimTicket", () => ({ useClaimTicket: mockUseClaim }));
vi.mock("./useAssignTo", () => ({ useAssignTo: mockUseAssignTo }));
vi.mock("./useCondoManagers", () => ({ useCondoManagers: mockUseCondoManagers }));
vi.mock("./useAddComment", () => ({ useAddComment: mockUseAddComment }));
vi.mock("@/features/tickets/useCanManageTicket", () => ({ useCanManageTicket: mockUseCanManage }));
vi.mock("@/stores/session", () => ({ useSessionStore: mockUseSession }));

const { mockCommitNow } = vi.hoisted(() => ({ mockCommitNow: vi.fn() }));
vi.mock("@/lib/notify", () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    deferred: vi.fn(),
    commitNow: mockCommitNow,
    cancel: vi.fn(),
  },
}));

import { TicketDetailPage } from "./TicketDetailPage";

const TICKET = {
  id: "t1",
  protocol: "TKT-2026-0001",
  title: "Vazamento na garagem",
  status: "open",
  priority: "high",
  resident_name: "Maria",
  common_area_name: "Garagem",
  description: "Água acumulando",
  created_at: "2026-05-20T08:00:00Z",
  updated_at: "2026-05-20T10:00:00Z",
};

beforeEach(() => {
  mockUseTicket.mockReturnValue({
    data: TICKET,
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  });
  mockUseTicketEvents.mockReturnValue({ data: [] });
  mockUseUpdateStatus.mockReturnValue({
    updateStatus: vi.fn(),
    pendingStatus: undefined,
    isError: false,
  });
  mockUseClaim.mockReturnValue({ claim: vi.fn(), isPending: false, isError: false });
  mockUseAssignTo.mockReturnValue({ assignTo: vi.fn(), isPending: false, isError: false });
  mockUseCondoManagers.mockReturnValue({ data: [] });
  mockUseAddComment.mockReturnValue({ addComment: vi.fn(), isPending: false, isError: false });
  mockUseCanManage.mockReturnValue(true);
  mockUseSession.mockImplementation((sel: (s: unknown) => unknown) =>
    sel({ session: { user: { id: "me" } } }),
  );
});

describe("TicketDetailPage", () => {
  it("renderiza header, protocolo, status control e composer (manager)", () => {
    render(<TicketDetailPage condoId="c1" ticketId="t1" onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Vazamento na garagem" })).toBeInTheDocument();
    expect(screen.getByText("TKT-2026-0001")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /mudar status/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /responsável pelo chamado/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("esconde controles de escrita quando não pode gerenciar", () => {
    mockUseCanManage.mockReturnValue(false);
    render(<TicketDetailPage condoId="c1" ticketId="t1" onClose={vi.fn()} />);
    expect(screen.queryByRole("group", { name: /mudar status/i })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("chama updateStatus ao clicar num status", async () => {
    const updateStatus = vi.fn();
    mockUseUpdateStatus.mockReturnValue({ updateStatus, pendingStatus: undefined, isError: false });
    render(<TicketDetailPage condoId="c1" ticketId="t1" onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Resolvido" }));
    expect(updateStatus).toHaveBeenCalledWith("resolved");
  });

  it("atribui a outro manager pelo picker", async () => {
    const assignTo = vi.fn();
    mockUseAssignTo.mockReturnValue({ assignTo, isPending: false, isError: false });
    mockUseCondoManagers.mockReturnValue({
      data: [
        { userId: "me", email: "me@ex.com", name: "Eu", role: "manager", label: "Eu" },
        { userId: "ana", email: "ana@ex.com", name: "Ana", role: "manager", label: "Ana" },
      ],
    });
    render(<TicketDetailPage condoId="c1" ticketId="t1" onClose={vi.fn()} />);
    // Ticket sem responsável → escolher na lista atribui direto (sem confirmação).
    await userEvent.click(screen.getByRole("button", { name: /responsável pelo chamado/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /ana/i }));
    expect(assignTo).toHaveBeenCalledWith("ana");
  });

  it("no unmount, commita uma mudança de status pendente (commitNow)", () => {
    const { unmount } = render(<TicketDetailPage condoId="c1" ticketId="t1" onClose={vi.fn()} />);
    unmount();
    expect(mockCommitNow).toHaveBeenCalledWith("ticket-status-t1");
  });

  it("chama onClose pelo 'Voltar para chamados' no estado de erro", async () => {
    const onClose = vi.fn();
    mockUseTicket.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      isFetching: false,
      refetch: vi.fn(),
    });
    render(<TicketDetailPage condoId="c1" ticketId="t1" onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /voltar para chamados/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("mostra loading", () => {
    mockUseTicket.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      isFetching: true,
      refetch: vi.fn(),
    });
    render(<TicketDetailPage condoId="c1" ticketId="t1" onClose={vi.fn()} />);
    expect(screen.getByText("Carregando chamado…")).toBeInTheDocument();
  });

  it("mostra erro com tentar novamente", () => {
    mockUseTicket.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      isFetching: false,
      refetch: vi.fn(),
    });
    render(<TicketDetailPage condoId="c1" ticketId="t1" onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeInTheDocument();
  });
});
