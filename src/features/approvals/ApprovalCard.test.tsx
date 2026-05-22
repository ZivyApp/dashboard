import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApprovalCard } from "./ApprovalCard";
import type { PendingResident } from "./pendingResident";

const RESIDENT: PendingResident = {
  id: "r1",
  name: "Lucas Ferreira",
  condoId: "c1",
  condoName: "Residencial Jardins",
  phone: "+5511999994312",
  createdAt: "2026-05-12T07:40:00Z",
};

describe("ApprovalCard", () => {
  it("mostra nome, condomínio e telefone mascarado", () => {
    render(<ApprovalCard resident={RESIDENT} onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText("Lucas Ferreira")).toBeInTheDocument();
    expect(screen.getByText("Residencial Jardins")).toBeInTheDocument();
    expect(screen.getByText("+55 11 9****-4312")).toBeInTheDocument();
  });

  it("dispara onApprove e onReject", async () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(<ApprovalCard resident={RESIDENT} onApprove={onApprove} onReject={onReject} />);
    await userEvent.click(screen.getByRole("button", { name: /aprovar/i }));
    await userEvent.click(screen.getByRole("button", { name: /rejeitar/i }));
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it("desabilita os botões quando busy", () => {
    render(<ApprovalCard resident={RESIDENT} onApprove={vi.fn()} onReject={vi.fn()} busy />);
    expect(screen.getByRole("button", { name: /aprovar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /rejeitar/i })).toBeDisabled();
  });
});
