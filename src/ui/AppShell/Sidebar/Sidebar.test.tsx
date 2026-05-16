import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
    <a {...(rest)}>{children}</a>
  ),
  useRouterState: () => ({ location: { pathname: "/inbox" } }),
}));

describe("Sidebar", () => {
  it("renderiza grupo OPERAÇÃO sempre", () => {
    render(<Sidebar scope={{ kind: "all" }} scopeTitle="Todos os condomínios" />);
    expect(screen.getByText(/Opera/i)).toBeInTheDocument();
    expect(screen.getByText("Inbox")).toBeInTheDocument();
  });

  it("omite ESTRUTURA quando scope é 'all'", () => {
    render(<Sidebar scope={{ kind: "all" }} scopeTitle="Todos os condomínios" />);
    expect(screen.queryByText(/Estrutura/i)).not.toBeInTheDocument();
  });

  it("mostra ESTRUTURA quando scope é 'condo'", () => {
    render(<Sidebar scope={{ kind: "condo", condoId: "c1" }} scopeTitle="Cond Y" />);
    expect(screen.getByText(/Estrutura/i)).toBeInTheDocument();
    expect(screen.getByText(/Blocos/i)).toBeInTheDocument();
  });

  it("renderiza header com title e subtitle", () => {
    render(
      <Sidebar
        scope={{ kind: "all" }}
        scopeTitle="Todos os condomínios"
        scopeSubtitle="5 condos · 488 unidades"
      />,
    );
    expect(screen.getByText("Todos os condomínios")).toBeInTheDocument();
    expect(screen.getByText("5 condos · 488 unidades")).toBeInTheDocument();
  });
});
