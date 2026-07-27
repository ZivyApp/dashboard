import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteBlockDialog } from "./DeleteBlockDialog";
import type { Block } from "./block";

const BLOCK: Block = { id: "b1", name: "Torre A" };

describe("DeleteBlockDialog", () => {
  it("não renderiza quando block é null", () => {
    render(<DeleteBlockDialog block={null} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("mostra o nome no título e a contagem de unidades quando disponível", () => {
    render(
      <DeleteBlockDialog block={BLOCK} unitCount={24} onCancel={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(screen.getByText(/Excluir Torre A\?/i)).toBeInTheDocument();
    expect(screen.getByText(/24 unidades/i)).toBeInTheDocument();
  });

  it("usa copy genérica sem contagem", () => {
    render(<DeleteBlockDialog block={BLOCK} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText(/todas as unidades vinculadas/i)).toBeInTheDocument();
  });

  it("confirma e cancela", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<DeleteBlockDialog block={BLOCK} onCancel={onCancel} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
