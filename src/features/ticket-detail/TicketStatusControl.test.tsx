import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketStatusControl } from "./TicketStatusControl";

describe("TicketStatusControl", () => {
  it("renderiza os 4 status com o atual marcado", () => {
    render(<TicketStatusControl status="in_progress" onChange={vi.fn()} disabled={false} />);
    expect(screen.getByRole("button", { name: "Aberto" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Em andamento" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("emite onChange ao clicar em outro status", async () => {
    const onChange = vi.fn();
    render(<TicketStatusControl status="open" onChange={onChange} disabled={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Resolvido" }));
    expect(onChange).toHaveBeenCalledWith("resolved");
  });

  it("não emite ao clicar no status já ativo", async () => {
    const onChange = vi.fn();
    render(<TicketStatusControl status="open" onChange={onChange} disabled={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Aberto" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("desabilita todos os botões quando disabled", () => {
    render(<TicketStatusControl status="open" onChange={vi.fn()} disabled={true} />);
    expect(screen.getByRole("button", { name: "Resolvido" })).toBeDisabled();
  });

  it("aplica classe pending no botão otimista quando pendingStatus é informado", () => {
    render(<TicketStatusControl status="resolved" onChange={() => {}} pendingStatus="resolved" />);
    const btn = screen.getByRole("button", { name: "Resolvido" });
    expect(btn.className).toMatch(/pending/);
  });
});
