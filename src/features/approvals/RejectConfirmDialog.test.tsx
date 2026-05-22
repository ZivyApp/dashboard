import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RejectConfirmDialog } from "./RejectConfirmDialog";
import type { PendingResident } from "./pendingResident";

const RESIDENT: PendingResident = {
  id: "r1",
  name: "Lucas Ferreira",
  condoId: "c1",
  condoName: "Residencial Jardins",
};

describe("RejectConfirmDialog", () => {
  it("não renderiza nada quando resident é null", () => {
    const { container } = render(
      <RejectConfirmDialog resident={null} onCancel={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra o nome no título e confirma/cancela", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<RejectConfirmDialog resident={RESIDENT} onCancel={onCancel} onConfirm={onConfirm} />);

    expect(screen.getByText(/Rejeitar Lucas Ferreira/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^rejeitar$/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
