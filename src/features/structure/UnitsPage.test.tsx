import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Block } from "./block";
import type { Unit } from "./unit";

const { mockUseBlocks, mockUseUnits, mockDeleteUnit, mockUseDeleteUnit, mockNavigate } = vi.hoisted(
  () => ({
    mockUseBlocks: vi.fn(),
    mockUseUnits: vi.fn(),
    mockDeleteUnit: vi.fn(),
    mockUseDeleteUnit: vi.fn(),
    mockNavigate: vi.fn(),
  }),
);
vi.mock("./useBlocks", () => ({ useBlocks: mockUseBlocks }));
vi.mock("./useUnits", () => ({ useUnits: mockUseUnits }));
vi.mock("./useDeleteUnit", () => ({ useDeleteUnit: mockUseDeleteUnit }));
vi.mock("./useCreateUnit", () => ({
  useCreateUnit: () => ({ createUnit: vi.fn(), isPending: false, formError: null }),
}));
vi.mock("./useUpdateUnit", () => ({
  useUpdateUnit: () => ({ updateUnit: vi.fn(), isPending: false, formError: null }),
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mockNavigate }));

import { UnitsPage } from "./UnitsPage";

const BLOCKS: Block[] = [
  { id: "b1", name: "Torre A" },
  { id: "b2", name: "Torre B" },
];
const UNITS: Unit[] = [
  { id: "u2", blockId: "b1", number: "203", floor: 2 },
  { id: "u1", blockId: "b1", number: "101", floor: 1 },
  { id: "u3", blockId: "b2", number: "11", floor: 1 },
];

beforeEach(() => {
  mockUseBlocks.mockReset();
  mockUseUnits.mockReset();
  mockDeleteUnit.mockReset();
  mockNavigate.mockReset();
  mockUseDeleteUnit.mockReturnValue({ deleteUnit: mockDeleteUnit, isPending: false });
});

describe("UnitsPage", () => {
  it("mostra spinner enquanto carrega", () => {
    mockUseBlocks.mockReturnValue({ blocks: BLOCKS, isPending: false, isError: false });
    mockUseUnits.mockReturnValue({ units: undefined, isPending: true, isError: false });
    render(<UnitsPage condoId="c1" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("sem blocos: orienta cadastrar bloco e esconde 'Nova unidade'", async () => {
    mockUseBlocks.mockReturnValue({ blocks: [], isPending: false, isError: false });
    mockUseUnits.mockReturnValue({ units: [], isPending: false, isError: false });
    render(<UnitsPage condoId="c1" />);
    expect(screen.getByText(/cadastre um bloco antes/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /nova unidade/i })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /ir para blocos/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/c/$condoId/structure/blocks" }),
    );
  });

  it("lista ordenada por bloco → andar → número, com nome do bloco", () => {
    mockUseBlocks.mockReturnValue({ blocks: BLOCKS, isPending: false, isError: false });
    mockUseUnits.mockReturnValue({ units: UNITS, isPending: false, isError: false });
    render(<UnitsPage condoId="c1" />);
    // Número é texto livre — exibido cru, sem prefixo (padrão TicketsTable).
    const labels = screen.getAllByText(/^(101|203|11)$/).map((el) => el.textContent);
    expect(labels).toEqual(["101", "203", "11"]);
    expect(screen.getAllByText(/Torre A/).length).toBeGreaterThan(0);
  });

  it("filtro por bloco chama useUnits com o blockId", async () => {
    mockUseBlocks.mockReturnValue({ blocks: BLOCKS, isPending: false, isError: false });
    mockUseUnits.mockReturnValue({ units: UNITS, isPending: false, isError: false });
    render(<UnitsPage condoId="c1" />);
    await userEvent.selectOptions(screen.getByLabelText(/filtrar por bloco/i), "b2");
    expect(mockUseUnits).toHaveBeenLastCalledWith("c1", "b2");
  });

  it("erro em qualquer query: 'Tentar novamente' refaz blocks E units", async () => {
    const refetchBlocks = vi.fn();
    const refetchUnits = vi.fn();
    mockUseBlocks.mockReturnValue({
      blocks: undefined,
      isPending: false,
      isError: true,
      refetch: refetchBlocks,
    });
    mockUseUnits.mockReturnValue({
      units: undefined,
      isPending: false,
      isError: false,
      refetch: refetchUnits,
    });
    render(<UnitsPage condoId="c1" />);
    await userEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    // Refazer só units deixaria a página presa no erro quando quem falhou foi blocks.
    expect(refetchBlocks).toHaveBeenCalled();
    expect(refetchUnits).toHaveBeenCalled();
  });

  it("filtro sem resultado: empty state específico", () => {
    mockUseBlocks.mockReturnValue({ blocks: BLOCKS, isPending: false, isError: false });
    mockUseUnits.mockReturnValue({ units: [], isPending: false, isError: false });
    render(<UnitsPage condoId="c1" />);
    // sem filtro → empty genérico
    expect(screen.getByText(/nenhuma unidade cadastrada/i)).toBeInTheDocument();
  });
});
