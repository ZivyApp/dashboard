import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TicketsFilters } from "./TicketsFilters";
import { useTicketsView } from "./viewModeStore";

const baseValue = { search: "", status: "all" as const, priority: "all" as const };
const baseCounts = { all: 10, open: 5, in_progress: 3, resolved: 1, closed: 1 };

describe("TicketsFilters", () => {
  beforeEach(() => {
    try {
      localStorage.removeItem("zivy-tickets-view");
    } catch {
      /* noop */
    }
    useTicketsView.setState({ mode: "table" });
  });

  it("renderiza search, status seg, priority select e view-toggle", () => {
    render(<TicketsFilters value={baseValue} counts={baseCounts} onChange={() => {}} />);

    expect(screen.getByRole("textbox", { name: /buscar chamados/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /todos \(10\)/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /abertos \(5\)/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/filtrar por prioridade/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /tabela/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /kanban/i })).toBeInTheDocument();
  });

  it("click em status emite onChange", async () => {
    const onChange = vi.fn();
    render(<TicketsFilters value={baseValue} counts={baseCounts} onChange={onChange} />);

    await userEvent.click(screen.getByRole("tab", { name: /em andamento/i }));
    expect(onChange).toHaveBeenCalledWith({ ...baseValue, status: "in_progress" });
  });

  it("digitar na busca emite onChange com search", async () => {
    const onChange = vi.fn();
    render(<TicketsFilters value={baseValue} counts={baseCounts} onChange={onChange} />);

    await userEvent.type(screen.getByRole("textbox", { name: /buscar/i }), "x");
    expect(onChange).toHaveBeenCalledWith({ ...baseValue, search: "x" });
  });

  it("click em view-toggle escreve no store", async () => {
    render(<TicketsFilters value={baseValue} counts={baseCounts} onChange={() => {}} />);

    await userEvent.click(screen.getByRole("tab", { name: /kanban/i }));
    expect(useTicketsView.getState().mode).toBe("kanban");
  });

  it("aria-selected reflete status atual", () => {
    render(
      <TicketsFilters
        value={{ ...baseValue, status: "open" }}
        counts={baseCounts}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("tab", { name: /abertos \(5\)/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
