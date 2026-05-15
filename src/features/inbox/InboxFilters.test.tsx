import { describe, expect, it, vi, afterEach } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InboxFilters } from "./InboxFilters";
import type { FilterState } from "./filterTickets";

const noFilters: FilterState = { search: "", status: "all", priority: "all" };

function Wrapper({ onChange }: { onChange?: (v: FilterState) => void }) {
  const [value, setValue] = useState<FilterState>(noFilters);
  return (
    <InboxFilters
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("InboxFilters", () => {
  it("renderiza campo de busca, segmented e select", () => {
    render(<InboxFilters value={noFilters} onChange={() => {}} />);
    expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tudo/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("digitar na busca chama onChange com novo search", async () => {
    const onChange = vi.fn();
    render(<Wrapper onChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText(/buscar/i), "elev");
    expect(onChange).toHaveBeenCalledTimes(4);
    expect(onChange).toHaveBeenLastCalledWith({ ...noFilters, search: "elev" });
  });

  it("clicar em 'Abertos' chama onChange com status=open", async () => {
    const onChange = vi.fn();
    render(<Wrapper onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /abertos/i }));
    expect(onChange).toHaveBeenCalledWith({ ...noFilters, status: "open" });
  });

  it("trocar select chama onChange com priority", async () => {
    const onChange = vi.fn();
    render(<Wrapper onChange={onChange} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "high");
    expect(onChange).toHaveBeenCalledWith({ ...noFilters, priority: "high" });
  });

  it("destaca o segmented ativo", () => {
    render(<InboxFilters value={{ ...noFilters, status: "in_progress" }} onChange={() => {}} />);
    const btn = screen.getByRole("button", { name: /em andamento/i });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });
});
