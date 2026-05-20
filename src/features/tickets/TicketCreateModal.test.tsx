import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Resident } from "@/types/resident";

const { mockUseResidents, mockUseCreateTicket } = vi.hoisted(() => ({
  mockUseResidents: vi.fn(),
  mockUseCreateTicket: vi.fn(),
}));
vi.mock("@/features/residents/useResidents", () => ({ useResidents: mockUseResidents }));
vi.mock("./useCreateTicket", () => ({ useCreateTicket: mockUseCreateTicket }));

import { TicketCreateModal } from "./TicketCreateModal";

const RESIDENTS: Resident[] = [
  { id: "r1", name: "Ana", status: "APPROVED" },
  { id: "r2", name: "Beto", status: "PENDING" },
];

function setup(overrides?: {
  create?: ReturnType<typeof vi.fn>;
  fieldErrors?: Record<string, string>;
  generalError?: string | null;
  residentsLoading?: boolean;
}) {
  const create = overrides?.create ?? vi.fn();
  mockUseResidents.mockReturnValue({
    residents: overrides?.residentsLoading ? undefined : RESIDENTS,
    isPending: overrides?.residentsLoading ?? false,
    isError: false,
  });
  mockUseCreateTicket.mockReturnValue({
    create,
    isPending: false,
    fieldErrors: overrides?.fieldErrors ?? {},
    generalError: overrides?.generalError ?? null,
  });
  const onClose = vi.fn();
  render(<TicketCreateModal condoId="c1" onClose={onClose} />);
  return { create, onClose };
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/título/i), { target: { value: "Vazamento" } });
  fireEvent.change(screen.getByLabelText(/morador/i), { target: { value: "r1" } });
  fireEvent.change(screen.getByLabelText(/prioridade/i), { target: { value: "high" } });
  fireEvent.change(screen.getByLabelText(/localização/i), { target: { value: "Garagem" } });
}

afterEach(() => {
  mockUseResidents.mockReset();
  mockUseCreateTicket.mockReset();
  vi.restoreAllMocks();
});

describe("TicketCreateModal", () => {
  it("mostra só moradores não-PENDING no picker", () => {
    setup();
    const select = screen.getByLabelText(/morador/i);
    expect(select).toHaveTextContent("Ana");
    expect(select).not.toHaveTextContent("Beto");
  });

  it("'Criar' começa desabilitado e habilita quando o form fica válido", () => {
    setup();
    const submit = screen.getByRole("button", { name: /criar/i });
    expect(submit).toBeDisabled();
    fillValidForm();
    expect(submit).toBeEnabled();
  });

  it("submit chama create com o payload e onSuccess", () => {
    const { create } = setup();
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /criar/i }));
    expect(create).toHaveBeenCalledOnce();
    // Verificar primeiro arg (payload)
    const firstArg: unknown = create.mock.lastCall?.[0];
    expect(firstArg).toEqual({
      title: "Vazamento",
      resident_id: "r1",
      priority: "high",
      location: "common_area",
      location_ref: "Garagem",
    });
    // Verificar segundo arg tem onSuccess como função
    const secondArg: unknown = create.mock.lastCall?.[1];
    const opts = secondArg as Record<string, unknown>;
    expect(typeof opts["onSuccess"]).toBe("function");
  });

  it("exibe erro de campo vindo de fieldErrors", () => {
    setup({ fieldErrors: { title: "obrigatório" } });
    expect(screen.getByText("obrigatório")).toBeInTheDocument();
  });

  it("exibe banner geral quando generalError sem fieldErrors", () => {
    setup({ generalError: "Falha ao criar chamado (HTTP 500)" });
    expect(screen.getByRole("alert")).toHaveTextContent("HTTP 500");
  });

  it("'Cancelar' chama onClose", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
