# Form "Novo chamado" (`POST /tickets`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o placeholder `/c/$condoId/tickets/new` por um form real de criação de chamado (`POST /tickets`) em modal sobre a lista de tickets.

**Architecture:** Modal Radix dirigido por rota (padrão `inbox/$ticketId`). Camada de dados em hooks: `useResidents` (GET, picker de morador, antecipa dados da Slice 6.4) e `useCreateTicket` (mutation). Form com estado local, validação derivada, erros por campo do `400`. Sucesso invalida a query de tickets e fecha o modal.

**Tech Stack:** React 19, TanStack Query (`useQuery`/`useMutation`), TanStack Router (file-based), `openapi-fetch` (`api.GET`/`api.POST`), Radix Dialog (via `@/ui/Modal`), CSS Modules + design tokens, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-20-plan-6-2-1-ticket-create-design.md`

**Branch:** `feature/plan-6-2-1-ticket-create` (já criada; spec já commitado nela).

---

## Convenções do projeto a respeitar (não negociáveis)

- **Tipagem honesta:** zero `any`/`as Domain`. Payload de API refinado por type guard que valida **cada item** (`isResident`, `isCompleteTicket`).
- **Hooks env-bound em teste:** `@/api/client` importa `@/lib/env` (eager, lança sem `.env.local`). Mockar com `vi.mock` + `vi.hoisted`, **nunca** `vi.spyOn`.
- **`exactOptionalPropertyTypes`:** omitir a chave (não `prop: undefined`) ao construir payload com campo opcional vazio.
- **Botões:** `type="submit"` só no botão Criar; demais `type="button"`.
- **Handlers com Promise** (ex.: `navigate`): envolver em `() => { void fn(); }`.
- **Commits frequentes**, mensagem `feat(plan-6-2-1): ...` + `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.

## File Structure

```
src/types/resident.ts                         # NOVO — domínio Resident + isResident
src/types/resident.test.ts                     # NOVO
src/features/residents/useResidents.ts         # NOVO — useQuery GET /residents
src/features/residents/useResidents.test.tsx   # NOVO
src/features/tickets/useCreateTicket.ts        # NOVO — useMutation POST /tickets
src/features/tickets/useCreateTicket.test.tsx  # NOVO
src/features/tickets/TicketCreateModal.tsx     # NOVO — o form
src/features/tickets/TicketCreateModal.module.css  # NOVO
src/features/tickets/TicketCreateModal.test.tsx    # NOVO
src/app/routes/_app/c/$condoId/tickets/new.tsx # MODIFICAR — sai EmptyState, entra modal
```

**Decisão de design (refina o spec):** `useResidents` retorna **todos** os moradores validados (sem filtrar status); o `TicketCreateModal` filtra `status !== "PENDING"` para o picker. Isso mantém o hook reutilizável pela Slice 6.4 (que precisa dos `PENDING` para aprovações) e deixa o filtro como responsabilidade do picker. O requisito do spec ("pendentes não aparecem no picker") continua atendido.

---

## Task 1: Domínio `Resident` + type guard

**Files:**

- Create: `src/types/resident.ts`
- Test: `src/types/resident.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/types/resident.test.ts
import { describe, expect, it } from "vitest";
import { isResident } from "./resident";

describe("isResident", () => {
  it("aceita objeto com id/name/status string", () => {
    expect(isResident({ id: "r1", name: "Ana", status: "APPROVED" })).toBe(true);
  });

  it("aceita unit_id opcional", () => {
    expect(isResident({ id: "r1", name: "Ana", status: "APPROVED", unit_id: "u1" })).toBe(true);
  });

  it("rejeita quando falta name", () => {
    expect(isResident({ id: "r1", status: "APPROVED" })).toBe(false);
  });

  it("rejeita quando status não é string", () => {
    expect(isResident({ id: "r1", name: "Ana", status: 3 })).toBe(false);
  });

  it("rejeita null e não-objeto", () => {
    expect(isResident(null)).toBe(false);
    expect(isResident("x")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/resident.test.ts`
Expected: FAIL — `isResident` não existe / módulo não encontrado.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/types/resident.ts
export interface Resident {
  id: string;
  name: string;
  /** ex.: "PENDING" | "APPROVED" | "REJECTED" — mantido como string (enum não modelado). */
  status: string;
  unit_id?: string;
}

/**
 * Type guard para o payload de `GET /residents` (openapi-typescript marca tudo
 * opcional). Valida cada campo obrigatório — usar com `filter(isResident)`.
 */
export function isResident(r: unknown): r is Resident {
  if (typeof r !== "object" || r === null) return false;
  const o = r as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.name === "string" && typeof o.status === "string";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/resident.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/types/resident.ts src/types/resident.test.ts
git commit -m "feat(plan-6-2-1): domínio Resident + isResident guard

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: `useResidents(condoId)`

**Files:**

- Create: `src/features/residents/useResidents.ts`
- Test: `src/features/residents/useResidents.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/residents/useResidents.test.tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Mock @/api/client antes do import — evita carregar src/lib/env (CLAUDE.md).
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { GET: mockGet } }));

import { useResidents } from "./useResidents";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

afterEach(() => {
  mockGet.mockReset();
  vi.restoreAllMocks();
});

describe("useResidents", () => {
  it("devolve todos os moradores válidos (sem filtrar status)", async () => {
    mockGet.mockResolvedValue({
      data: [
        { id: "r1", name: "Ana", status: "APPROVED" },
        { id: "r2", name: "Beto", status: "PENDING" },
      ],
      error: undefined,
    });
    const qc = mkClient();
    const { result } = renderHook(() => useResidents("c1"), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(mockGet).toHaveBeenCalledWith("/residents");
    expect(result.current.residents?.map((r) => r.id)).toEqual(["r1", "r2"]);
  });

  it("filtra payloads incompletos via isResident", async () => {
    mockGet.mockResolvedValue({
      data: [{ id: "r1", name: "Ana", status: "APPROVED" }, { id: "x" }],
      error: undefined,
    });
    const qc = mkClient();
    const { result } = renderHook(() => useResidents("c1"), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.residents?.map((r) => r.id)).toEqual(["r1"]);
  });

  it("expõe isError quando a chamada falha", async () => {
    mockGet.mockResolvedValue({ data: undefined, error: { message: "boom" } });
    const qc = mkClient();
    const { result } = renderHook(() => useResidents("c1"), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/residents/useResidents.test.tsx`
Expected: FAIL — módulo `./useResidents` não existe.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/residents/useResidents.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Resident } from "@/types/resident";
import { isResident } from "@/types/resident";

async function fetchResidents(): Promise<Resident[]> {
  const { data, error } = await api.GET("/residents");
  if (error) {
    throw new Error("ResidentsService.fetchAll: falha em GET /residents", { cause: error });
  }
  return (data ?? []).filter(isResident);
}

export function useResidents(condoId: string) {
  const query = useQuery({
    queryKey: ["residents", condoId] as const,
    queryFn: fetchResidents,
    staleTime: 5 * 60_000,
  });
  return {
    residents: query.data,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/residents/useResidents.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/residents/useResidents.ts src/features/residents/useResidents.test.tsx
git commit -m "feat(plan-6-2-1): useResidents — GET /residents com type guard

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: `useCreateTicket(condoId)`

**Files:**

- Create: `src/features/tickets/useCreateTicket.ts`
- Test: `src/features/tickets/useCreateTicket.test.tsx`

**Contrato:** o hook expõe `{ create, isPending, fieldErrors, generalError }`. `create(input, opts?)` chama a mutation; `fieldErrors`/`generalError` são derivados de `mutation.error` (assim o componente não precisa importar helpers e o teste do modal mocka um objeto simples).

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/tickets/useCreateTicket.test.tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { POST: mockPost } }));

import { useCreateTicket } from "./useCreateTicket";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () => new QueryClient({ defaultOptions: { mutations: { retry: false } } });

const VALID_INPUT = {
  title: "Vazamento",
  resident_id: "r1",
  priority: "high" as const,
  location: "common_area" as const,
  location_ref: "Garagem",
};

afterEach(() => {
  mockPost.mockReset();
  vi.restoreAllMocks();
});

describe("useCreateTicket", () => {
  it("no sucesso devolve o ticket e invalida a query de tickets", async () => {
    mockPost.mockResolvedValue({
      data: {
        id: "t1",
        protocol: "TKT-1",
        title: "Vazamento",
        status: "open",
        priority: "high",
        updated_at: "2026-05-20T00:00:00Z",
      },
      error: undefined,
      response: { status: 201 },
    });
    const qc = mkClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useCreateTicket("c1"), { wrapper: wrapper(qc) });

    await act(async () => {
      result.current.create(VALID_INPUT);
    });

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost).toHaveBeenCalledWith("/tickets", {
      body: {
        title: "Vazamento",
        resident_id: "r1",
        priority: "high",
        location: "common_area",
        location_ref: "Garagem",
      },
    });
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tickets", "c1"] }));
  });

  it("inclui description quando presente", async () => {
    mockPost.mockResolvedValue({
      data: {
        id: "t1",
        protocol: "TKT-1",
        title: "Vazamento",
        status: "open",
        priority: "high",
        updated_at: "2026-05-20T00:00:00Z",
      },
      error: undefined,
      response: { status: 201 },
    });
    const qc = mkClient();
    const { result } = renderHook(() => useCreateTicket("c1"), { wrapper: wrapper(qc) });
    await act(async () => {
      result.current.create({ ...VALID_INPUT, description: "detalhe" });
    });
    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost.mock.calls[0]?.[1]).toEqual({
      body: {
        title: "Vazamento",
        resident_id: "r1",
        priority: "high",
        location: "common_area",
        location_ref: "Garagem",
        description: "detalhe",
      },
    });
  });

  it("mapeia 400 { campo: msg } para fieldErrors", async () => {
    mockPost.mockResolvedValue({
      data: undefined,
      error: { title: "obrigatório" },
      response: { status: 400 },
    });
    const qc = mkClient();
    const { result } = renderHook(() => useCreateTicket("c1"), { wrapper: wrapper(qc) });
    await act(async () => {
      result.current.create(VALID_INPUT);
    });
    await waitFor(() => expect(result.current.fieldErrors).toEqual({ title: "obrigatório" }));
  });

  it("erro sem field map vira generalError", async () => {
    mockPost.mockResolvedValue({
      data: undefined,
      error: { message: "x" },
      response: { status: 500 },
    });
    const qc = mkClient();
    const { result } = renderHook(() => useCreateTicket("c1"), { wrapper: wrapper(qc) });
    await act(async () => {
      result.current.create(VALID_INPUT);
    });
    await waitFor(() => expect(result.current.generalError).toContain("500"));
    expect(result.current.fieldErrors).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/tickets/useCreateTicket.test.tsx`
Expected: FAIL — módulo `./useCreateTicket` não existe.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/tickets/useCreateTicket.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Ticket, TicketPriority } from "@/types/ticket";
import { isCompleteTicket } from "@/types/ticket";

export interface CreateTicketInput {
  title: string;
  resident_id: string;
  priority: TicketPriority;
  location: "unit" | "common_area";
  location_ref: string;
  description?: string;
}

export class CreateTicketError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;
  constructor(status: number, fieldErrors: Record<string, string>) {
    super(messageForStatus(status, fieldErrors));
    this.name = "CreateTicketError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function isFieldErrorMap(v: unknown): v is Record<string, string> {
  if (typeof v !== "object" || v === null) return false;
  return Object.values(v).every((x) => typeof x === "string");
}

function messageForStatus(status: number, fieldErrors: Record<string, string>): string {
  if (status === 403) return "Sem permissão para criar chamados neste condomínio.";
  const first = Object.values(fieldErrors)[0];
  if (first) return first;
  return `Falha ao criar chamado (HTTP ${String(status)})`;
}

function toRequest(input: CreateTicketInput) {
  return {
    title: input.title,
    resident_id: input.resident_id,
    priority: input.priority,
    location: input.location,
    location_ref: input.location_ref,
    ...(input.description ? { description: input.description } : {}),
  };
}

export function useCreateTicket(condoId: string) {
  const qc = useQueryClient();
  const m = useMutation<Ticket, CreateTicketError | Error, CreateTicketInput>({
    mutationFn: async (input) => {
      const { data, error, response } = await api.POST("/tickets", { body: toRequest(input) });
      if (error || !data) {
        const fieldErrors = isFieldErrorMap(error) ? error : {};
        throw new CreateTicketError(response.status, fieldErrors);
      }
      if (!isCompleteTicket(data)) {
        throw new Error("TicketsService.create: payload incompleto na resposta de POST /tickets");
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets", condoId] }),
  });

  const fieldErrors = m.error instanceof CreateTicketError ? m.error.fieldErrors : {};
  const generalError = m.error ? m.error.message : null;

  return {
    create: (input: CreateTicketInput, opts?: { onSuccess?: () => void }) => m.mutate(input, opts),
    isPending: m.isPending,
    fieldErrors,
    generalError,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/tickets/useCreateTicket.test.tsx`
Expected: PASS (4 tests).

> **Nota de tipo:** `api.POST("/tickets", { body })` é tipado pelo `openapi-fetch`; `response.status` é `number`. Se o `tsc` reclamar que `error` pode ser `undefined` no `isFieldErrorMap(error)`, está ok — o guard trata `undefined` (cai no `typeof v !== "object"`). Rodar `npm run typecheck` antes do commit.

- [ ] **Step 5: Commit**

```bash
git add src/features/tickets/useCreateTicket.ts src/features/tickets/useCreateTicket.test.tsx
git commit -m "feat(plan-6-2-1): useCreateTicket — POST /tickets + erros por campo

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: `TicketCreateModal`

**Files:**

- Create: `src/features/tickets/TicketCreateModal.tsx`
- Create: `src/features/tickets/TicketCreateModal.module.css`
- Test: `src/features/tickets/TicketCreateModal.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/tickets/TicketCreateModal.test.tsx
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
    expect(create).toHaveBeenCalledWith(
      {
        title: "Vazamento",
        resident_id: "r1",
        priority: "high",
        location: "common_area",
        location_ref: "Garagem",
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/tickets/TicketCreateModal.test.tsx`
Expected: FAIL — módulo `./TicketCreateModal` não existe.

- [ ] **Step 3: Write the component**

```tsx
// src/features/tickets/TicketCreateModal.tsx
import { useState, type FormEvent } from "react";
import { Modal } from "@/ui/Modal/Modal";
import { Button } from "@/ui/Button/Button";
import { useResidents } from "@/features/residents/useResidents";
import { useCreateTicket, type CreateTicketInput } from "./useCreateTicket";
import type { TicketPriority } from "@/types/ticket";
import styles from "./TicketCreateModal.module.css";

interface Props {
  condoId: string;
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
];

const LOCATION_OPTIONS: { value: "common_area" | "unit"; label: string }[] = [
  { value: "common_area", label: "Área comum" },
  { value: "unit", label: "Unidade" },
];

export function TicketCreateModal({ condoId, onClose }: Props) {
  const { residents, isPending: residentsLoading, isError: residentsError } = useResidents(condoId);
  const { create, isPending, fieldErrors, generalError } = useCreateTicket(condoId);

  const [title, setTitle] = useState("");
  const [residentId, setResidentId] = useState("");
  const [priority, setPriority] = useState<"" | TicketPriority>("");
  const [locationType, setLocationType] = useState<"common_area" | "unit">("common_area");
  const [locationRef, setLocationRef] = useState("");
  const [description, setDescription] = useState("");

  const pickable = (residents ?? []).filter((r) => r.status !== "PENDING");
  const canSubmit =
    title.trim() !== "" && residentId !== "" && priority !== "" && locationRef.trim() !== "";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || priority === "") return;
    const input: CreateTicketInput = {
      title: title.trim(),
      resident_id: residentId,
      priority,
      location: locationType,
      location_ref: locationRef.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
    };
    create(input, { onSuccess: onClose });
  }

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const banner = hasFieldErrors ? "Verifique os campos destacados." : generalError;

  return (
    <Modal open title="Novo chamado" onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit}>
        {banner ? (
          <p role="alert" className={styles.banner}>
            {banner}
          </p>
        ) : null}

        <label className={styles.field}>
          <span>Título *</span>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            aria-describedby={fieldErrors.title ? "err-title" : undefined}
          />
          {fieldErrors.title ? (
            <small id="err-title" className={styles.err}>
              {fieldErrors.title}
            </small>
          ) : null}
        </label>

        <label className={styles.field}>
          <span>Morador *</span>
          <select
            value={residentId}
            disabled={residentsLoading || residentsError}
            onChange={(e) => {
              setResidentId(e.target.value);
            }}
            aria-describedby={fieldErrors.resident_id ? "err-resident" : undefined}
          >
            <option value="">
              {residentsLoading ? "Carregando…" : residentsError ? "Erro ao carregar" : "Selecione"}
            </option>
            {pickable.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {fieldErrors.resident_id ? (
            <small id="err-resident" className={styles.err}>
              {fieldErrors.resident_id}
            </small>
          ) : null}
        </label>

        <label className={styles.field}>
          <span>Prioridade *</span>
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value as "" | TicketPriority);
            }}
          >
            <option value="">Selecione</option>
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.locationRow}>
          <label className={styles.field}>
            <span>Tipo de local</span>
            <select
              value={locationType}
              onChange={(e) => {
                setLocationType(e.target.value as "common_area" | "unit");
              }}
            >
              {LOCATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Localização *</span>
            <input
              type="text"
              placeholder="ex.: Elevador B, Apto 101"
              value={locationRef}
              onChange={(e) => {
                setLocationRef(e.target.value);
              }}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span>Descrição</span>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
          />
        </label>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit || isPending}>
            {isPending ? "Criando…" : "Criar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 4: Write the CSS Module**

```css
/* src/features/tickets/TicketCreateModal.module.css */
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.field input,
.field select,
.field textarea {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font: inherit;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.locationRow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: var(--space-3);
}

.banner {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-danger-bg);
  color: var(--color-danger-fg);
  font-size: var(--font-size-sm);
}

.err {
  color: var(--color-danger-fg);
  font-size: var(--font-size-xs);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
```

> **Tokens:** confirmar os nomes reais em `src/design-tokens/` (o stylelint `declaration-strict-value` barra valores crus). Se algum token usado aqui (`--color-danger-bg`, `--color-danger-fg`, `--color-accent`, `--radius-md`, `--space-*`, `--font-size-*`) não existir com esse nome, abrir `src/design-tokens/*.css` e usar o equivalente existente (ex.: ver os tokens usados em `TicketsFilters.module.css` e `Modal.module.css`). Não inventar token novo nesta slice.

- [ ] **Step 5: Run tests + lint to verify**

Run: `npx vitest run src/features/tickets/TicketCreateModal.test.tsx`
Expected: PASS (6 tests).

Run: `npm run lint`
Expected: sem erros (eslint + stylelint). Corrigir tokens crus se o stylelint reclamar.

- [ ] **Step 6: Commit**

```bash
git add src/features/tickets/TicketCreateModal.tsx src/features/tickets/TicketCreateModal.module.css src/features/tickets/TicketCreateModal.test.tsx
git commit -m "feat(plan-6-2-1): TicketCreateModal — form Novo chamado

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Ligar a rota `tickets/new`

**Files:**

- Modify: `src/app/routes/_app/c/$condoId/tickets/new.tsx`

- [ ] **Step 1: Substituir o placeholder pelo modal**

```tsx
// src/app/routes/_app/c/$condoId/tickets/new.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { requireRole } from "@/lib/routeGuards";
import { TicketCreateModal } from "@/features/tickets/TicketCreateModal";

export const Route = createFileRoute("/_app/c/$condoId/tickets/new")({
  beforeLoad: requireRole("staff"),
  component: NewTicketRoute,
});

function NewTicketRoute() {
  const { condoId } = Route.useParams();
  const navigate = useNavigate();
  return (
    <TicketCreateModal
      condoId={condoId}
      onClose={() => {
        void navigate({ to: "/c/$condoId/tickets", params: { condoId } });
      }}
    />
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: sem erros. (A rota já existe no `routeTree.gen.ts` desde a Slice 6.2 — só mudou o `component`; não precisa regenerar.)

- [ ] **Step 3: Commit**

```bash
git add src/app/routes/_app/c/\$condoId/tickets/new.tsx
git commit -m "feat(plan-6-2-1): rota tickets/new renderiza TicketCreateModal

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Verificação final + PR

- [ ] **Step 1: Suíte completa + typecheck + lint + build**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: tudo verde. Testes esperados: os 287 da base + ~18 novos (5 resident + 3 useResidents + 4 useCreateTicket + 6 modal).

- [ ] **Step 2: Simular CI sem env (memory `feedback_ci_env_simulation`)**

```bash
mv .env.local .env.local.bak && npm run test ; mv .env.local.bak .env.local
```

Expected: verde mesmo sem `.env.local` (todos os hooks env-bound estão mockados com `vi.mock`+`vi.hoisted`).

- [ ] **Step 3: Smoke manual**

```bash
npm run dev
```

- [ ] Login como **staff/manager** → `/c/<id>/tickets` → "Novo chamado" abre o modal.
- [ ] Picker de morador lista moradores (sem os `PENDING`).
- [ ] "Criar" só habilita com título + morador + prioridade + localização.
- [ ] Criar com sucesso → modal fecha, volta para `/tickets`, o novo chamado aparece na lista.
- [ ] Forçar erro (ex.: backend offline) → banner de erro, form preservado.
- [ ] Login como **viewer** → `/c/<id>/tickets/new` direto na URL → guard `requireRole("staff")` bloqueia.

> Matar o dev server (`kill $PID`) após o smoke — processo órfão regenera `routeTree.gen.ts` e trava checkout (CLAUDE.md "Tooling").

- [ ] **Step 4: Push + PR**

```bash
git push -u origin feature/plan-6-2-1-ticket-create
```

Abrir PR contra `develop` (skill `pr` ou `gh pr create --base develop`). Descrição: contexto (substitui placeholder da 6.2), blocos (Resident type, useResidents, useCreateTicket, TicketCreateModal, rota), endpoint consumido (`POST /tickets`), decisões/desvios (localização texto livre; `useResidents` retorna todos e o modal filtra PENDING; sem picker de área comum), e test plan.

---

## Self-review (preenchido pelo autor do plano)

- **Cobertura do spec:** Modal por rota (Task 5) ✓; campos title/resident/priority/location/description (Task 4) ✓; useResidents + type guard (Tasks 1–2) ✓; useCreateTicket + invalidação + 400 (Task 3) ✓; validação canSubmit (Task 4) ✓; banner de erro + erro por campo (Tasks 3–4) ✓; pós-sucesso fecha+atualiza (Tasks 3–5) ✓; a11y label/aria-describedby/type=button (Task 4) ✓; testes co-localizados (todas) ✓.
- **Desvio consciente do spec:** filtro `PENDING` movido do hook para o modal (justificado em "File Structure") — requisito "não aparecem no picker" segue atendido; ganha reuso para a 6.4.
- **Verificação Core pendente (do spec):** nome do campo `resident_id` e obrigatoriedade — confirmar no `core@develop` no início da execução; ajusta só mensagens de erro, não o happy path. Se houver drift de tipos, rodar `npm run sync:swagger && npm run gen:api`.
- **Consistência de tipos:** `CreateTicketInput` (Task 3) é o tipo usado pelo modal (Task 4); `Resident`/`isResident` (Task 1) usados por `useResidents` (Task 2) e modal (Task 4); `isCompleteTicket`/`Ticket`/`TicketPriority` reusados de `src/types/ticket.ts`.
- **Placeholders:** nenhum — todo step tem código/comando concreto.
