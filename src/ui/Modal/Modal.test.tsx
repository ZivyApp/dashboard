import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Modal", () => {
  it("não renderiza nada quando open=false", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Teste">
        <p>conteúdo</p>
      </Modal>,
    );
    expect(screen.queryByText("conteúdo")).not.toBeInTheDocument();
  });

  it("renderiza children quando open=true", () => {
    render(
      <Modal open={true} onClose={() => {}} title="Teste">
        <p>conteúdo</p>
      </Modal>,
    );
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });

  it("expõe título acessível via dialog", () => {
    render(
      <Modal open={true} onClose={() => {}} title="Detalhes do ticket">
        <p>x</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Detalhes do ticket" })).toBeInTheDocument();
  });

  it("chama onClose ao apertar Esc", async () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="T">
        <p>x</p>
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("chama onClose ao clicar no botão fechar", async () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="T">
        <p>x</p>
      </Modal>,
    );
    await userEvent.click(screen.getByRole("button", { name: /fechar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
