import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Ticket } from "@/types/ticket";
import { RecentActivityTable, type RecentRow } from "./RecentActivityTable";

function mkRow(over: Partial<Ticket>, condoName: string, condoId: string): RecentRow {
  return {
    condoId,
    condoName,
    ticket: {
      id: `${condoId}-t`,
      protocol: "TKT-9",
      title: "Vazamento",
      status: "open",
      priority: "high",
      updated_at: "2026-05-20T00:00:00Z",
      ...over,
    },
  };
}

describe("RecentActivityTable", () => {
  it("mostra coluna Condomínio quando showCondo", () => {
    render(<RecentActivityTable rows={[mkRow({}, "Solar", "c1")]} showCondo onPick={vi.fn()} />);
    expect(screen.getByText("Condomínio")).toBeInTheDocument();
    expect(screen.getByText("Solar")).toBeInTheDocument();
  });

  it("esconde coluna Condomínio quando !showCondo", () => {
    render(
      <RecentActivityTable rows={[mkRow({}, "Solar", "c1")]} showCondo={false} onPick={vi.fn()} />,
    );
    expect(screen.queryByText("Condomínio")).not.toBeInTheDocument();
  });

  it("clique na linha chama onPick com condoId e ticketId", () => {
    const onPick = vi.fn();
    render(<RecentActivityTable rows={[mkRow({}, "Solar", "c1")]} showCondo onPick={onPick} />);
    fireEvent.click(screen.getByRole("button", { name: /vazamento/i }));
    expect(onPick).toHaveBeenCalledWith("c1", "c1-t");
  });
});
