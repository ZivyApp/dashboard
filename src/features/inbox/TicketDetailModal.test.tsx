import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockUseTicket, mockRefetch } = vi.hoisted(() => ({
  mockUseTicket: vi.fn(),
  mockRefetch: vi.fn(),
}));

vi.mock("./useTicket", () => ({
  useTicket: mockUseTicket,
}));

import { TicketDetailModal } from "./TicketDetailModal";

const mkTicket = () => ({
  id: "t1",
  protocol: "TKT-2026-00041",
  title: "Elevador parado no 8º andar",
  status: "in_progress" as const,
  priority: "high" as const,
  resident_name: "Mariana Costa",
  unit_number: "803",
  block_name: "Bloco A",
  description: "Elevador apresentou ruído estranho e parou de funcionar.",
  updated_at: "2026-05-14T12:00:00Z",
  created_at: "2026-05-14T08:00:00Z",
});

afterEach(() => {
  mockUseTicket.mockReset();
  mockRefetch.mockReset();
});

describe("TicketDetailModal", () => {
  it("mostra spinner em loading", () => {
    mockUseTicket.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      isSuccess: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<TicketDetailModal ticketId="t1" onClose={() => {}} />);
    expect(screen.getByRole("status", { name: /carregando/i })).toBeInTheDocument();
  });

  it("renderiza protocolo, título, badges, descrição e placeholder", () => {
    mockUseTicket.mockReturnValue({
      data: mkTicket(),
      isPending: false,
      isError: false,
      isSuccess: true,
      error: null,
      refetch: mockRefetch,
    });
    render(<TicketDetailModal ticketId="t1" onClose={() => {}} />);
    expect(screen.getByText("TKT-2026-00041")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Elevador parado no 8º andar" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Em andamento")).toBeInTheDocument();
    expect(screen.getByText("Alta")).toBeInTheDocument();
    expect(screen.getByText(/elevador apresentou ruído/i)).toBeInTheDocument();
    expect(screen.getByText("Mariana Costa")).toBeInTheDocument();
    expect(screen.getByText(/comentários, atribuição/i)).toBeInTheDocument();
  });

  it("mostra mensagem 404 com botões voltar e tentar novamente", async () => {
    const onClose = vi.fn();
    mockUseTicket.mockReturnValue({
      data: undefined,
      isPending: false,
      isFetching: false,
      isError: true,
      isSuccess: false,
      error: new Error("not found"),
      refetch: mockRefetch,
    });
    render(<TicketDetailModal ticketId="zzz" onClose={onClose} />);
    expect(screen.getByRole("heading", { name: /ticket não encontrado/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(mockRefetch).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: /voltar para inbox/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("desabilita botão tentar novamente enquanto refetching", () => {
    mockUseTicket.mockReturnValue({
      data: undefined,
      isPending: false,
      isFetching: true,
      isError: true,
      isSuccess: false,
      error: new Error("not found"),
      refetch: mockRefetch,
    });
    render(<TicketDetailModal ticketId="zzz" onClose={() => {}} />);
    const btn = screen.getByRole("button", { name: /tentando/i });
    expect(btn).toBeDisabled();
  });

  it("Esc chama onClose", async () => {
    const onClose = vi.fn();
    mockUseTicket.mockReturnValue({
      data: mkTicket(),
      isPending: false,
      isError: false,
      isSuccess: true,
      error: null,
      refetch: mockRefetch,
    });
    render(<TicketDetailModal ticketId="t1" onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
