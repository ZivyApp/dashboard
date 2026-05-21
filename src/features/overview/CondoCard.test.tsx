import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { CondoMembership } from "@/features/condo/useMyCondos";
import { CondoCard } from "./CondoCard";

const CONDO: CondoMembership = {
  condoId: "c1",
  condoName: "Solar das Flores",
  condoSlug: "solar",
  role: "manager",
};
const STATS = { open: 3, inProgress: 2, resolved: 5, urgent: 1 };

describe("CondoCard", () => {
  it("mostra mark, nome e stats", () => {
    render(<CondoCard condo={CONDO} stats={STATS} onFocus={vi.fn()} />);
    expect(screen.getByText("SF")).toBeInTheDocument();
    expect(screen.getByText("Solar das Flores")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("clique chama onFocus com o condoId", () => {
    const onFocus = vi.fn();
    render(<CondoCard condo={CONDO} stats={STATS} onFocus={onFocus} />);
    fireEvent.click(screen.getByRole("button", { name: /solar das flores/i }));
    expect(onFocus).toHaveBeenCalledWith("c1");
  });
});
