import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { anyFn } from "@/test-setup";
import type { Block } from "./block";

const { mockCreateBlock, mockUpdateBlock, mockUseCreateBlock, mockUseUpdateBlock } = vi.hoisted(
  () => ({
    mockCreateBlock: vi.fn(),
    mockUpdateBlock: vi.fn(),
    mockUseCreateBlock: vi.fn(),
    mockUseUpdateBlock: vi.fn(),
  }),
);
vi.mock("./useCreateBlock", () => ({ useCreateBlock: mockUseCreateBlock }));
vi.mock("./useUpdateBlock", () => ({ useUpdateBlock: mockUseUpdateBlock }));

import { BlockFormModal } from "./BlockFormModal";

const BLOCK: Block = { id: "b1", name: "Torre A", description: "Bloco da frente" };

beforeEach(() => {
  mockCreateBlock.mockReset();
  mockUpdateBlock.mockReset();
  mockUseCreateBlock.mockReturnValue({
    createBlock: mockCreateBlock,
    isPending: false,
    formError: null,
  });
  mockUseUpdateBlock.mockReturnValue({
    updateBlock: mockUpdateBlock,
    isPending: false,
    formError: null,
  });
});

describe("BlockFormModal — criação (block=null)", () => {
  it("submit desabilitado até preencher o nome", async () => {
    render(<BlockFormModal condoId="c1" block={null} onClose={vi.fn()} />);
    const submit = screen.getByRole("button", { name: /^criar$/i });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/^nome$/i), "Torre A");
    expect(submit).toBeEnabled();
  });

  it("submete com trim e omite description vazia", async () => {
    render(<BlockFormModal condoId="c1" block={null} onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/^nome$/i), "  Torre A  ");
    await userEvent.click(screen.getByRole("button", { name: /^criar$/i }));
    expect(mockCreateBlock).toHaveBeenCalledWith(
      { name: "Torre A" },
      expect.objectContaining({ onSuccess: anyFn() }),
    );
  });
});

describe("BlockFormModal — edição (block presente)", () => {
  it("vem preenchido e submete updateBlock com description sempre presente", async () => {
    render(<BlockFormModal condoId="c1" block={BLOCK} onClose={vi.fn()} />);
    expect(screen.getByText(/editar bloco/i)).toBeInTheDocument();
    const desc = screen.getByLabelText(/descrição/i);
    expect(desc).toHaveValue("Bloco da frente");
    await userEvent.clear(desc);
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));
    expect(mockUpdateBlock).toHaveBeenCalledWith(
      { id: "b1", name: "Torre A", description: "" },
      expect.objectContaining({ onSuccess: anyFn() }),
    );
  });
});

describe("BlockFormModal — erro", () => {
  it("exibe banner role=alert com o formError do hook", () => {
    mockUseCreateBlock.mockReturnValue({
      createBlock: mockCreateBlock,
      isPending: false,
      formError: "Nome é obrigatório",
    });
    render(<BlockFormModal condoId="c1" block={null} onClose={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Nome é obrigatório");
  });
});
