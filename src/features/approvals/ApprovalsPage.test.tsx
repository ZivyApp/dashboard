import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PendingResident } from "./pendingResident";

const { mockUsePending, mockApprove, mockReject, mockUseScope } = vi.hoisted(() => ({
  mockUsePending: vi.fn(),
  mockApprove: vi.fn(),
  mockReject: vi.fn(),
  mockUseScope: vi.fn(),
}));
vi.mock("./usePendingResidents", () => ({ usePendingResidents: mockUsePending }));
vi.mock("./useApproveResident", () => ({
  useApproveResident: () => ({ approve: mockApprove, isPending: false, isError: false }),
}));
vi.mock("./useRejectResident", () => ({
  useRejectResident: () => ({ reject: mockReject, isPending: false, isError: false }),
}));
vi.mock("@/features/scope/useScope", () => ({ useScope: mockUseScope }));

import { ApprovalsPage } from "./ApprovalsPage";

const R: PendingResident = {
  id: "r1",
  name: "Lucas Ferreira",
  condoId: "c1",
  condoName: "Residencial Jardins",
  phone: "+5511999994312",
  createdAt: "2026-05-12T07:40:00Z",
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("ApprovalsPage", () => {
  it("mostra spinner enquanto pending", () => {
    mockUseScope.mockReturnValue({ kind: "all" });
    mockUsePending.mockReturnValue({ residents: [], isPending: true, isError: false });
    render(<ApprovalsPage />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("estado vazio inicial (sem aprovados)", () => {
    mockUseScope.mockReturnValue({ kind: "all" });
    mockUsePending.mockReturnValue({ residents: [], isPending: false, isError: false });
    render(<ApprovalsPage />);
    expect(screen.getByText(/nenhuma aprovação pendente/i)).toBeInTheDocument();
  });

  it("lista residents e aprova (chama mutation com id+condoId)", async () => {
    mockUseScope.mockReturnValue({ kind: "all" });
    mockUsePending.mockReturnValue({ residents: [R], isPending: false, isError: false });
    mockApprove.mockImplementation((_input, opts?: { onSuccess?: () => void }) =>
      opts?.onSuccess?.(),
    );

    render(<ApprovalsPage />);
    await userEvent.click(screen.getByRole("button", { name: /aprovar/i }));

    const [firstCallArgs] = mockApprove.mock.calls;
    expect(firstCallArgs?.[0]).toEqual({ id: "r1", condoId: "c1" });
    expect(firstCallArgs?.[1]).toHaveProperty("onSuccess", expect.any(Function));
    await waitFor(() => expect(screen.getByText(/1 aprovado nesta sessão/i)).toBeInTheDocument());
  });

  it("mostra mensagem de erro quando isError", () => {
    mockUseScope.mockReturnValue({ kind: "all" });
    mockUsePending.mockReturnValue({ residents: [], isPending: false, isError: true });
    render(<ApprovalsPage />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/não foi possível carregar/i)).toBeInTheDocument();
  });

  it("rejeitar abre confirm; confirmar chama a mutation", async () => {
    mockUseScope.mockReturnValue({ kind: "all" });
    mockUsePending.mockReturnValue({ residents: [R], isPending: false, isError: false });

    render(<ApprovalsPage />);
    await userEvent.click(screen.getByRole("button", { name: /rejeitar/i }));
    // After dialog opens both the card button and dialog confirm button match /^Rejeitar$/i.
    // Scope to the dialog to avoid ambiguity (verbatim test had a duplicate-name bug).
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: /^rejeitar$/i });
    await userEvent.click(confirm);

    const [firstCallArgs] = mockReject.mock.calls;
    expect(firstCallArgs?.[0]).toEqual({ id: "r1", condoId: "c1" });
    expect(firstCallArgs?.[1]).toHaveProperty("onSuccess", expect.any(Function));
  });

  it("estado 'tudo aprovado' após aprovar e lista esvaziar", async () => {
    mockUseScope.mockReturnValue({ kind: "all" });
    mockApprove.mockImplementation((_input, opts?: { onSuccess?: () => void }) =>
      opts?.onSuccess?.(),
    );
    mockUsePending.mockReturnValue({ residents: [R], isPending: false, isError: false });

    const { rerender } = render(<ApprovalsPage />);
    await userEvent.click(screen.getByRole("button", { name: /aprovar/i }));

    // refetch agora devolve lista vazia; approvedCount já é 1
    mockUsePending.mockReturnValue({ residents: [], isPending: false, isError: false });
    rerender(<ApprovalsPage />);

    expect(screen.getByText(/tudo aprovado/i)).toBeInTheDocument();
  });
});
