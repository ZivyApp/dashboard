import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renderiza título e descrição", () => {
    render(<EmptyState title="Vazio" description="Nada aqui" />);
    expect(screen.getByRole("heading", { name: "Vazio" })).toBeInTheDocument();
    expect(screen.getByText("Nada aqui")).toBeInTheDocument();
  });

  it("renderiza a ação quando passada", () => {
    render(
      <EmptyState
        title="Vazio"
        description="Nada aqui"
        action={<button type="button">Agir</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Agir" })).toBeInTheDocument();
  });

  it("não renderiza botão quando a ação está ausente", () => {
    render(<EmptyState title="Vazio" description="Nada aqui" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("aplica o role quando passado", () => {
    render(<EmptyState title="Erro" description="Falhou" role="alert" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("não tem role por padrão (estado neutro)", () => {
    render(<EmptyState title="Vazio" description="Nada aqui" />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
