import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteUnitDialog } from "./DeleteUnitDialog";
import type { Unit } from "./unit";

const UNIT: Unit = { id: "u1", blockId: "b1", number: "203", floor: 2 };

describe("DeleteUnitDialog", () => {
  it("não renderiza quando unit é null", () => {
    render(<DeleteUnitDialog unit={null} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("mostra o número no título e avisa sobre moradores vinculados", () => {
    render(<DeleteUnitDialog unit={UNIT} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText(/Excluir unidade 203\?/i)).toBeInTheDocument();
    expect(screen.getByText(/moradores vinculados/i)).toBeInTheDocument();
  });

  it("confirma e cancela", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<DeleteUnitDialog unit={UNIT} onCancel={onCancel} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
