import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { anyFn } from "@/test-setup";
import type { Block } from "./block";
import type { Unit } from "./unit";

const { mockUseBlocks, mockUseUnits, mockDeleteBlock, mockUseDeleteBlock, mockRefetch } =
  vi.hoisted(() => ({
    mockUseBlocks: vi.fn(),
    mockUseUnits: vi.fn(),
    mockDeleteBlock: vi.fn(),
    mockUseDeleteBlock: vi.fn(),
    mockRefetch: vi.fn(),
  }));
vi.mock("./useBlocks", () => ({ useBlocks: mockUseBlocks }));
vi.mock("./useUnits", () => ({ useUnits: mockUseUnits }));
vi.mock("./useDeleteBlock", () => ({ useDeleteBlock: mockUseDeleteBlock }));
vi.mock("./useCreateBlock", () => ({
  useCreateBlock: () => ({ createBlock: vi.fn(), isPending: false, formError: null }),
}));
vi.mock("./useUpdateBlock", () => ({
  useUpdateBlock: () => ({ updateBlock: vi.fn(), isPending: false, formError: null }),
}));

import { BlocksPage } from "./BlocksPage";

const BLOCKS: Block[] = [
  { id: "b1", name: "Torre A", description: "Frente" },
  { id: "b2", name: "Torre B" },
];
const UNITS: Unit[] = [
  { id: "u1", blockId: "b1", number: "101" },
  { id: "u2", blockId: "b1", number: "102" },
];

beforeEach(() => {
  mockUseBlocks.mockReset();
  mockUseUnits.mockReset();
  mockDeleteBlock.mockReset();
  mockRefetch.mockReset();
  mockUseDeleteBlock.mockReturnValue({ deleteBlock: mockDeleteBlock, isPending: false });
  mockUseUnits.mockReturnValue({ units: UNITS, isPending: false, isError: false });
});

describe("BlocksPage", () => {
  it("mostra spinner enquanto carrega", () => {
    mockUseBlocks.mockReturnValue({ blocks: undefined, isPending: true, isError: false });
    render(<BlocksPage condoId="c1" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("erro: role=alert e botão dispara refetch", async () => {
    mockUseBlocks.mockReturnValue({
      blocks: undefined,
      isPending: false,
      isError: true,
      refetch: mockRefetch,
    });
    render(<BlocksPage condoId="c1" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("vazio: EmptyState com ação que abre o form de criação", async () => {
    mockUseBlocks.mockReturnValue({ blocks: [], isPending: false, isError: false });
    render(<BlocksPage condoId="c1" />);
    await userEvent.click(screen.getByRole("button", { name: /cadastrar bloco/i }));
    // Título "Novo bloco" também existe no botão do header — escopo no dialog.
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/novo bloco/i)).toBeInTheDocument();
  });

  it("lista blocos com contagem de unidades derivada", () => {
    mockUseBlocks.mockReturnValue({ blocks: BLOCKS, isPending: false, isError: false });
    render(<BlocksPage condoId="c1" />);
    expect(screen.getByText("Torre A")).toBeInTheDocument();
    expect(screen.getByText(/2 unidades/)).toBeInTheDocument();
    expect(screen.getByText(/0 unidades/)).toBeInTheDocument(); // Torre B
  });

  it("excluir abre dialog com contagem; confirmar chama a mutation", async () => {
    mockUseBlocks.mockReturnValue({ blocks: BLOCKS, isPending: false, isError: false });
    render(<BlocksPage condoId="c1" />);
    await userEvent.click(screen.getByRole("button", { name: /excluir torre a/i }));
    // "2 unidades" aparece na linha e no dialog — escopo no dialog.
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Excluir Torre A\?/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/2 unidades/i)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: /^excluir$/i }));
    expect(mockDeleteBlock).toHaveBeenCalledWith(
      { id: "b1" },
      expect.objectContaining({ onSuccess: anyFn() }),
    );
  });
});
