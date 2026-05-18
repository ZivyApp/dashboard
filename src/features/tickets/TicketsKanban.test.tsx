import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TicketsKanban } from "./TicketsKanban";
import type { Ticket } from "./types";

function make(status: Ticket["status"], id: string, overrides: Partial<Ticket> = {}): Ticket {
  return {
    id,
    protocol: `TKT-${id}`,
    title: `Ticket ${id}`,
    status,
    priority: "medium",
    updated_at: "2026-05-14T12:00:00Z",
    ...overrides,
  };
}

describe("TicketsKanban", () => {
  it("agrupa tickets por status nas 4 colunas", () => {
    const tickets = [
      make("open", "1"),
      make("open", "2"),
      make("in_progress", "3"),
      make("resolved", "4"),
    ];
    render(<TicketsKanban tickets={tickets} onPick={vi.fn()} />);

    const openCol = screen.getByRole("region", { name: /abertos/i });
    expect(within(openCol).getByText("2")).toBeInTheDocument();

    const inProgressCol = screen.getByRole("region", { name: /em andamento/i });
    expect(within(inProgressCol).getByText("1")).toBeInTheDocument();

    const closedCol = screen.getByRole("region", { name: /fechados/i });
    expect(within(closedCol).getByText("Nenhum chamado")).toBeInTheDocument();
  });

  it("click no card chama onPick(id)", async () => {
    const onPick = vi.fn();
    render(<TicketsKanban tickets={[make("open", "abc")]} onPick={onPick} />);

    await userEvent.click(screen.getByRole("button", { name: /abrir TKT-abc/i }));
    expect(onPick).toHaveBeenCalledWith("abc");
  });

  it("renderiza 4 colunas mesmo quando vazias", () => {
    render(<TicketsKanban tickets={[]} onPick={vi.fn()} />);
    expect(screen.getAllByRole("region")).toHaveLength(4);
    expect(screen.getAllByText("Nenhum chamado")).toHaveLength(4);
  });
});
