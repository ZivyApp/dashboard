import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Topbar } from "./Topbar";

vi.mock("@/features/condo/CondoSwitcher", () => ({
  CondoSwitcher: () => <div data-testid="condo-switcher" />,
}));

describe("Topbar", () => {
  it("renderiza logo, switcher, busca e role badge", () => {
    // eslint-disable-next-line jsx-a11y/aria-role
    render(<Topbar role="super_admin" />);
    expect(screen.getByText(/Zivy/i)).toBeInTheDocument();
    expect(screen.getByTestId("condo-switcher")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Buscar/i)).toBeInTheDocument();
    expect(screen.getByText(/Administradora/i)).toBeInTheDocument();
  });
});
