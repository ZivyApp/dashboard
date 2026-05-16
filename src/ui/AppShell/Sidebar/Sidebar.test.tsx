import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

const mockPathname = { current: "/inbox" };

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    ...rest
  }: { children: React.ReactNode; to?: string; params?: Record<string, string> } & Record<
    string,
    unknown
  >) => {
    let href = to ?? "#";
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        href = href.replace(`$${k}`, v);
      }
    }
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
  useRouterState: () => ({ location: { pathname: mockPathname.current } }),
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

  it("mostra ESTRUTURA quando scope é 'condo' e currentRole é manager", () => {
    render(
      <Sidebar
        scope={{ kind: "condo", condoId: "c1" }}
        scopeTitle="Cond Y"
        currentRole="manager"
      />,
    );
    expect(screen.getByText(/Estrutura/i)).toBeInTheDocument();
    expect(screen.getByText(/Blocos/i)).toBeInTheDocument();
  });

  it("esconde Aprovações para staff em scope 'condo'", () => {
    render(
      <Sidebar scope={{ kind: "condo", condoId: "c1" }} scopeTitle="Cond Y" currentRole="staff" />,
    );
    expect(screen.queryByText(/Aprovações/i)).not.toBeInTheDocument();
  });

  it("esconde Estrutura para staff em scope 'condo'", () => {
    render(
      <Sidebar scope={{ kind: "condo", condoId: "c1" }} scopeTitle="Cond Y" currentRole="staff" />,
    );
    expect(screen.queryByText(/Estrutura/i)).not.toBeInTheDocument();
  });

  it("mostra Aprovações em scope 'all' se aggregateRoles inclui manager", () => {
    render(
      <Sidebar scope={{ kind: "all" }} scopeTitle="Todos" aggregateRoles={["manager", "viewer"]} />,
    );
    expect(screen.getByText(/Aprovações/i)).toBeInTheDocument();
  });

  it("esconde Aprovações em scope 'all' se aggregateRoles não inclui >= manager", () => {
    render(
      <Sidebar scope={{ kind: "all" }} scopeTitle="Todos" aggregateRoles={["viewer", "staff"]} />,
    );
    expect(screen.queryByText(/Aprovações/i)).not.toBeInTheDocument();
  });

  it("marca o item Inbox como active no scope condo quando pathname bate", () => {
    mockPathname.current = "/c/c1/inbox";
    render(<Sidebar scope={{ kind: "condo", condoId: "c1" }} scopeTitle="Cond Y" />);
    const inboxLabel = screen.getByText("Inbox");
    const wrapper = inboxLabel.closest("a, button");
    expect(wrapper?.className).toContain("active");
    mockPathname.current = "/inbox";
  });

  it("marca o item Inbox como active no scope all quando pathname é /inbox", () => {
    mockPathname.current = "/inbox";
    render(<Sidebar scope={{ kind: "all" }} scopeTitle="Todos os condomínios" />);
    const inboxLabel = screen.getByText("Inbox");
    const wrapper = inboxLabel.closest("a, button");
    expect(wrapper?.className).toContain("active");
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
