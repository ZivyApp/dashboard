import { describe, expect, it } from "vitest";
import { filterTickets, type Ticket, type FilterState } from "./filterTickets";

const t = (overrides: Partial<Ticket> = {}): Ticket => {
  const base: Ticket = {
    id: "id-1",
    protocol: "TKT-2026-00001",
    title: "Elevador parado",
    status: "open",
    priority: "high",
    updated_at: "2026-05-14T10:00:00Z",
  };
  return { ...base, ...overrides };
};

const noFilters: FilterState = { search: "", status: "all", priority: "all" };

describe("filterTickets", () => {
  it("retorna identidade quando não há filtros", () => {
    const list = [t({ id: "a" }), t({ id: "b" })];
    expect(filterTickets(list, noFilters)).toHaveLength(2);
  });

  it("filtra por status open", () => {
    const list = [t({ id: "a", status: "open" }), t({ id: "b", status: "in_progress" })];
    const out = filterTickets(list, { ...noFilters, status: "open" });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("a");
  });

  it("filtra por priority high", () => {
    const list = [t({ id: "a", priority: "high" }), t({ id: "b", priority: "low" })];
    const out = filterTickets(list, { ...noFilters, priority: "high" });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("a");
  });

  it("busca por título case-insensitive", () => {
    const list = [t({ id: "a", title: "Elevador parado" }), t({ id: "b", title: "Vazamento" })];
    const out = filterTickets(list, { ...noFilters, search: "ELEV" });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("a");
  });

  it("busca por protocolo", () => {
    const list = [
      t({ id: "a", protocol: "TKT-2026-00041" }),
      t({ id: "b", protocol: "TKT-2026-00099" }),
    ];
    const out = filterTickets(list, { ...noFilters, search: "00041" });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("a");
  });

  it("busca por nome do morador", () => {
    const list = [
      t({ id: "a", resident_name: "Mariana Costa" }),
      t({ id: "b", resident_name: "Lucas Ferreira" }),
    ];
    const out = filterTickets(list, { ...noFilters, search: "lucas" });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("b");
  });

  it("combina status + priority + search", () => {
    const list = [
      t({ id: "a", status: "open", priority: "high", title: "Elevador" }),
      t({ id: "b", status: "in_progress", priority: "high", title: "Elevador" }),
      t({ id: "c", status: "open", priority: "low", title: "Elevador" }),
      t({ id: "d", status: "open", priority: "high", title: "Vazamento" }),
    ];
    const out = filterTickets(list, { search: "elev", status: "open", priority: "high" });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("a");
  });

  it("ordena por prioridade desc, depois updated_at desc", () => {
    const list = [
      t({ id: "low-old", priority: "low", updated_at: "2026-05-10T00:00:00Z" }),
      t({ id: "high-old", priority: "high", updated_at: "2026-05-10T00:00:00Z" }),
      t({ id: "high-new", priority: "high", updated_at: "2026-05-14T00:00:00Z" }),
      t({ id: "med-new", priority: "medium", updated_at: "2026-05-14T00:00:00Z" }),
    ];
    const out = filterTickets(list, noFilters);
    expect(out.map((x) => x.id)).toEqual(["high-new", "high-old", "med-new", "low-old"]);
  });

  it("lida com lista vazia", () => {
    expect(filterTickets([], noFilters)).toEqual([]);
  });
});
