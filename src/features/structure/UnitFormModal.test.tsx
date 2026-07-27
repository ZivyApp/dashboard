import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { anyFn } from "@/test-setup";
import type { Block } from "./block";
import type { Unit } from "./unit";

const { mockCreateUnit, mockUpdateUnit, mockUseCreateUnit, mockUseUpdateUnit } = vi.hoisted(() => ({
  mockCreateUnit: vi.fn(),
  mockUpdateUnit: vi.fn(),
  mockUseCreateUnit: vi.fn(),
  mockUseUpdateUnit: vi.fn(),
}));
vi.mock("./useCreateUnit", () => ({ useCreateUnit: mockUseCreateUnit }));
vi.mock("./useUpdateUnit", () => ({ useUpdateUnit: mockUseUpdateUnit }));

import { UnitFormModal } from "./UnitFormModal";

const BLOCKS: Block[] = [
  { id: "b1", name: "Torre A" },
  { id: "b2", name: "Torre B" },
];
const UNIT: Unit = { id: "u1", blockId: "b1", number: "203", floor: 2 };

beforeEach(() => {
  mockCreateUnit.mockReset();
  mockUpdateUnit.mockReset();
  mockUseCreateUnit.mockReturnValue({
    createUnit: mockCreateUnit,
    isPending: false,
    formError: null,
  });
  mockUseUpdateUnit.mockReturnValue({
    updateUnit: mockUpdateUnit,
    isPending: false,
    formError: null,
  });
});

describe("UnitFormModal — criação (unit=null)", () => {
  it("submit desabilitado até escolher bloco e preencher número", async () => {
    render(<UnitFormModal condoId="c1" unit={null} blocks={BLOCKS} onClose={vi.fn()} />);
    const submit = screen.getByRole("button", { name: /^criar$/i });
    expect(submit).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText(/bloco/i), "b1");
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/número/i), "101");
    expect(submit).toBeEnabled();
  });

  it("submete sem floor quando o campo está vazio", async () => {
    render(<UnitFormModal condoId="c1" unit={null} blocks={BLOCKS} onClose={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText(/bloco/i), "b1");
    await userEvent.type(screen.getByLabelText(/número/i), "101");
    await userEvent.click(screen.getByRole("button", { name: /^criar$/i }));
    expect(mockCreateUnit).toHaveBeenCalledWith(
      { blockId: "b1", number: "101" },
      expect.objectContaining({ onSuccess: anyFn() }),
    );
  });

  it("submete com floor parseado quando preenchido", async () => {
    render(<UnitFormModal condoId="c1" unit={null} blocks={BLOCKS} onClose={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText(/bloco/i), "b2");
    await userEvent.type(screen.getByLabelText(/número/i), "203");
    await userEvent.type(screen.getByLabelText(/andar/i), "2");
    await userEvent.click(screen.getByRole("button", { name: /^criar$/i }));
    expect(mockCreateUnit).toHaveBeenCalledWith(
      { blockId: "b2", number: "203", floor: 2 },
      expect.objectContaining({ onSuccess: anyFn() }),
    );
  });
});

describe("UnitFormModal — edição (unit presente)", () => {
  it("não mostra select de bloco; exibe o nome do bloco como texto", () => {
    render(<UnitFormModal condoId="c1" unit={UNIT} blocks={BLOCKS} onClose={vi.fn()} />);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText("Torre A")).toBeInTheDocument();
  });

  it("submete updateUnit sem blockId", async () => {
    render(<UnitFormModal condoId="c1" unit={UNIT} blocks={BLOCKS} onClose={vi.fn()} />);
    const number = screen.getByLabelText(/número/i);
    await userEvent.clear(number);
    await userEvent.type(number, "204");
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));
    expect(mockUpdateUnit).toHaveBeenCalledWith(
      { id: "u1", number: "204", floor: 2 },
      expect.objectContaining({ onSuccess: anyFn() }),
    );
  });
});
