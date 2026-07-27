# Plan 8.1 — Estrutura: CRUD de Blocos + Unidades

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir os placeholders das rotas `/c/$condoId/structure/blocks` e `/c/$condoId/structure/units` por CRUDs completos (list/create/edit/delete) contra o Core, com toasts de feedback e confirmação destrutiva com copy de consequência.

**Architecture:** TanStack Query + `openapi-fetch` direto (sem repository — os endpoints já existem, YAGNI). Feature nova `src/features/structure/`. As rotas são per-condo e manager-gated, então **sem fan-out cross-condo**: o middleware do `api` client já injeta `X-Condo-ID` do condo ativo (`src/api/auth.ts` — hooks de leitura não passam header explícito, padrão `useResidents`). Forms em **modal local** na página (decisão do brainstorm — nada de rotas filhas novas). Mutations com **`notify.success` / `notify.error` + retry** (padrão Plan 7). Delete via **ConfirmDialog com copy de consequência** (cascade / SET NULL documentados no Core).

**Tech Stack:** React 19 · TanStack Query/Router · TypeScript strict · `openapi-fetch` · Radix Dialog (via `Modal`) · sonner (via `notify`) · CSS Modules + design tokens · Vitest + Testing Library.

---

## Decisões de escopo (brainstorm 2026-07-21)

| Decisão                | Escolha                                                                                     | Alternativa rejeitada                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Divisão do Plan 8      | **8.1 = Blocos+Unidades** (acoplados via `block_id`); **8.2 = Áreas comuns** (independente) | Plan único com 3 CRUDs (~16 tasks, PR pesado)                                           |
| Formulário create/edit | **Modal local na página** (padrão `RejectConfirmDialog`)                                    | Rota filha (padrão `TicketCreateModal`) — deep-link não agrega para forms de 2-3 campos |
| Feedback de mutations  | **Toasts `notify` com retry** (padrão Plan 7)                                               | Silencioso (padrão approvals — erro de mutation invisível)                              |
| Delete                 | **Incluído nas 2 entidades**, com ConfirmDialog e copy da consequência                      | Adiar delete (deixaria gestão incompleta)                                               |

## Contexto do Core (ground truth — não inventar campos)

Fonte: `src/api/openapi.json` (Core v1.15.0). Shapes com **todos os campos opcionais** na geração — mappers/type guards obrigatórios, nunca cast de domínio.

### Blocos

| Operação              | Contrato                                                             |
| --------------------- | -------------------------------------------------------------------- |
| `GET /blocks`         | `BlockResponse[]` — array puro, sem paginação/envelope               |
| `POST /blocks`        | body `{ name?, description? }` → `201 BlockResponse`                 |
| `PATCH /blocks/{id}`  | body `{ name?, description? }` parcial → `200 BlockResponse`         |
| `DELETE /blocks/{id}` | → `204` sem body · ⚠️ **CASCADE: remove todas as unidades do bloco** |

`BlockResponse`: `{ condo_id?, created_at?, description?, id?, name?, updated_at? }` — tudo string.

### Unidades

| Operação             | Contrato                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `GET /units`         | `UnitResponse[]` — array puro; **único filtro server-side: `?block_id=<uuid>`** (opcional)       |
| `POST /units`        | body `{ block_id?, floor?: integer, number? }` → `201 UnitResponse` (**`block_id` vai no body**) |
| `PATCH /units/{id}`  | body `{ floor?, number? }` → `200` · ⚠️ **não é possível trocar a unidade de bloco**             |
| `DELETE /units/{id}` | → `204` sem body · ⚠️ **residents vinculados ficam com `unit_id = NULL`**                        |

`UnitResponse`: `{ block_id?, condo_id?, created_at?, floor?: integer, id?, number?, updated_at? }`.

### Armadilhas do contrato (aplicam-se às tasks)

1. **Sem paginação** em nenhum endpoint — listas são arrays puros; ordenação/contagem são client-side.
2. **Sem `required`, sem enums, sem constraints** formais — validação de domínio é responsabilidade do frontend (mappers + validação de form).
3. **Erros são mapas `string→string`** (`{"error": "..."}` ou `{"campo": "..."}`), sem componente compartilhado. **400 = validação**; 403/409/422 **não existem** no contrato inteiro.
4. **`X-Condo-ID` não consta no swagger** — é convenção do cliente, injetado globalmente pelo middleware (`applyAuthHeaders`). Hooks per-condo **não** passam header explícito.
5. `GET /units` aceita `params: { query: { block_id?: string } }` no cliente gerado (confirmado em `src/api/types.ts`).

---

## File structure

```
src/features/structure/                     # NOVO (toda a slice)
├── block.ts                                # Block + toBlock (mapper → T | null)
├── block.test.ts
├── unit.ts                                 # Unit + toUnit + formatFloor
├── unit.test.ts
├── structureError.ts                       # StructureFormError + toStructureError
├── structureError.test.ts
├── useBlocks.ts                            # GET /blocks → ["blocks", condoId]
├── useBlocks.test.tsx
├── useUnits.ts                             # GET /units → ["units", condoId, blockId | "all"]
├── useUnits.test.tsx
├── useCreateBlock.ts                       # POST + toast + invalidate
├── useCreateBlock.test.tsx
├── useUpdateBlock.ts                       # PATCH + toast + invalidate
├── useUpdateBlock.test.tsx
├── useDeleteBlock.ts                       # DELETE + toast + invalidate blocks+units (cascade)
├── useDeleteBlock.test.tsx
├── useCreateUnit.ts                        # POST (block_id no body) + toast + invalidate
├── useCreateUnit.test.tsx
├── useUpdateUnit.ts                        # PATCH (sem block_id) + toast + invalidate
├── useUpdateUnit.test.tsx
├── useDeleteUnit.ts                        # DELETE + toast + invalidate units
├── useDeleteUnit.test.tsx
├── BlockFormModal.tsx                      # create (block=null) e edit no mesmo modal
├── BlockFormModal.module.css
├── BlockFormModal.test.tsx
├── DeleteBlockDialog.tsx                   # confirm com copy CASCADE (+N unidades)
├── DeleteBlockDialog.module.css
├── DeleteBlockDialog.test.tsx
├── UnitFormModal.tsx                       # select bloco (create only), number, floor
├── UnitFormModal.module.css
├── UnitFormModal.test.tsx
├── DeleteUnitDialog.tsx                    # confirm com copy SET NULL
├── DeleteUnitDialog.module.css
├── DeleteUnitDialog.test.tsx
├── BlocksPage.tsx                          # header + lista + contagens + modais
├── BlocksPage.module.css
├── BlocksPage.test.tsx
├── UnitsPage.tsx                           # header + filtro por bloco + lista + modais
├── UnitsPage.module.css
└── UnitsPage.test.tsx

src/app/routes/_app/c/$condoId/structure/blocks.tsx   # MODIFICAR — placeholder → <BlocksPage/>
src/app/routes/_app/c/$condoId/structure/units.tsx    # MODIFICAR — placeholder → <UnitsPage/>
```

**Sem rotas novas → sem regen de `routeTree.gen.ts`.** Sidebar já tem os 3 itens de Estrutura — **zero mudança** no AppShell. Sem stories novas (nenhum primitivo de UI criado; páginas não têm stories, padrão `ApprovalsPage`).

**Convenções obrigatórias (CLAUDE.md):** identificadores em inglês, UI em pt-BR · sem `any`/cast de domínio — mappers `toBlock`/`toUnit` retornam `T | null` + `filter` · `exactOptionalPropertyTypes`: omitir chave de prop opcional, nunca `prop: undefined` · hooks que importam `@/api/client` testados com `vi.mock` + `vi.hoisted` (nunca `vi.spyOn`) · botões `type="button"` · handlers com Promise envolvidos em `() => { void fn(); }` · classes CSS Module via `Record<…>` com `?? ""` quando variantes · CSS só com tokens (`stylelint-declaration-strict-value`) — tokens confirmados: `--space-*`, `--fs-*`, `--fw-*`, `--fg-primary/secondary/tertiary`, `--bg-surface/muted/canvas`, `--border`, `--border-strong`, `--radius-sm/md/lg/pill`, `--brand`, `--brand-soft`, `--danger-soft-bg/--danger-soft-fg`, `--info-bg/--info-fg`, `--font-mono`, `--lh-relaxed`. **`--success-bg` NÃO existe** — não usar.

---

## Task 1: Domínio — `block.ts`, `unit.ts` (+`formatFloor`), `structureError.ts`

Mappers no padrão `toPendingResident` (retornam `T | null`, sem type guard `is X` solto). `formatFloor` é apresentação pura. `structureError.ts` é o plumbing de erro compartilhado pelas 6 mutations: erro 400 com mapa de strings vira mensagem inline (banner do modal); o resto vira fallback com status.

**Files:**

- Create: `src/features/structure/block.ts`
- Create: `src/features/structure/unit.ts`
- Create: `src/features/structure/structureError.ts`
- Test: `src/features/structure/block.test.ts`
- Test: `src/features/structure/unit.test.ts`
- Test: `src/features/structure/structureError.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/structure/block.test.ts
import { describe, expect, it } from "vitest";
import { toBlock } from "./block";

describe("toBlock", () => {
  it("mapeia um bloco completo", () => {
    expect(toBlock({ id: "b1", name: "Torre A", description: "Bloco da frente" })).toEqual({
      id: "b1",
      name: "Torre A",
      description: "Bloco da frente",
    });
  });

  it("omite description ausente ou vazia (não vira undefined explícito)", () => {
    const sem = toBlock({ id: "b1", name: "Torre A" });
    expect(sem).not.toBeNull();
    expect(sem && "description" in sem).toBe(false);
    const vazia = toBlock({ id: "b1", name: "Torre A", description: "" });
    expect(vazia && "description" in vazia).toBe(false);
  });

  it("retorna null sem id ou name", () => {
    expect(toBlock({ name: "Torre A" })).toBeNull();
    expect(toBlock({ id: "b1" })).toBeNull();
    expect(toBlock({ id: "b1", name: "" })).toBeNull();
  });
});
```

```ts
// src/features/structure/unit.test.ts
import { describe, expect, it } from "vitest";
import { formatFloor, toUnit } from "./unit";

describe("toUnit", () => {
  it("mapeia uma unidade completa", () => {
    expect(toUnit({ id: "u1", block_id: "b1", number: "203", floor: 2 })).toEqual({
      id: "u1",
      blockId: "b1",
      number: "203",
      floor: 2,
    });
  });

  it("omite floor ausente e ignora floor não-inteiro", () => {
    const sem = toUnit({ id: "u1", block_id: "b1", number: "203" });
    expect(sem).not.toBeNull();
    expect(sem && "floor" in sem).toBe(false);
    const fracionado = toUnit({ id: "u1", block_id: "b1", number: "203", floor: 2.5 });
    expect(fracionado && "floor" in fracionado).toBe(false);
  });

  it("retorna null sem id, number ou block_id", () => {
    expect(toUnit({ block_id: "b1", number: "203" })).toBeNull();
    expect(toUnit({ id: "u1", number: "203" })).toBeNull();
    expect(toUnit({ id: "u1", block_id: "b1" })).toBeNull();
  });
});

describe("formatFloor", () => {
  it("0 vira Térreo", () => {
    expect(formatFloor(0)).toBe("Térreo");
  });
  it("positivos viram Nº andar", () => {
    expect(formatFloor(2)).toBe("2º andar");
  });
  it("negativos (subsolo) viram Nº andar", () => {
    expect(formatFloor(-1)).toBe("-1º andar");
  });
  it("undefined vira traço", () => {
    expect(formatFloor(undefined)).toBe("—");
  });
});
```

```ts
// src/features/structure/structureError.test.ts
import { describe, expect, it } from "vitest";
import { StructureFormError, toStructureError } from "./structureError";

describe("toStructureError", () => {
  it("usa a primeira mensagem do body quando 400 com mapa de strings", () => {
    const err = toStructureError(400, { name: "Nome é obrigatório" }, "Falha");
    expect(err).toBeInstanceOf(StructureFormError);
    expect(err.status).toBe(400);
    expect(err.message).toBe("Nome é obrigatório");
  });

  it("cai no fallback com status quando o body não é mapa de strings", () => {
    const err = toStructureError(500, { weird: 1 }, "Falha ao salvar");
    expect(err.message).toBe("Falha ao salvar (HTTP 500)");
  });

  it("cai no fallback quando 400 vem com body vazio", () => {
    const err = toStructureError(400, {}, "Falha");
    expect(err.message).toBe("Falha (HTTP 400)");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/structure/block.test.ts src/features/structure/unit.test.ts src/features/structure/structureError.test.ts`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Write minimal implementations**

```ts
// src/features/structure/block.ts

/** Bloco do condomínio, pronto para a UI. */
export interface Block {
  id: string;
  name: string;
  description?: string;
}

/** Shape cru de BlockResponse (openapi-typescript marca tudo opcional). */
export type RawBlock = {
  id?: string;
  name?: string;
  description?: string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/**
 * Mapeia `BlockResponse` cru → `Block`, ou `null` se inválido.
 * Ponto único de verdade — usar com `.map(toBlock).filter(nonNull)`.
 */
export function toBlock(raw: RawBlock): Block | null {
  if (!isNonEmptyString(raw.id) || !isNonEmptyString(raw.name)) return null;
  return {
    id: raw.id,
    name: raw.name,
    ...(isNonEmptyString(raw.description) ? { description: raw.description } : {}),
  };
}
```

```ts
// src/features/structure/unit.ts

/** Unidade do condomínio (apto, sala...), pronta para a UI. */
export interface Unit {
  id: string;
  blockId: string;
  number: string;
  floor?: number;
}

/** Shape cru de UnitResponse (openapi-typescript marca tudo opcional). */
export type RawUnit = {
  id?: string;
  block_id?: string;
  number?: string;
  floor?: number;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/** Mapeia `UnitResponse` cru → `Unit`, ou `null` se inválido. */
export function toUnit(raw: RawUnit): Unit | null {
  if (
    !isNonEmptyString(raw.id) ||
    !isNonEmptyString(raw.number) ||
    !isNonEmptyString(raw.block_id)
  ) {
    return null;
  }
  return {
    id: raw.id,
    blockId: raw.block_id,
    number: raw.number,
    ...(typeof raw.floor === "number" && Number.isInteger(raw.floor) ? { floor: raw.floor } : {}),
  };
}

/** "Térreo" para 0, "Nº andar" caso contrário, "—" quando ausente. */
export function formatFloor(floor: number | undefined): string {
  if (floor === undefined) return "—";
  if (floor === 0) return "Térreo";
  return `${String(floor)}º andar`;
}
```

```ts
// src/features/structure/structureError.ts

/**
 * Erro de mutation de estrutura. `status === 400` indica erro de validação do
 * Core: a mensagem vai para o banner inline do modal (sem toast). Demais
 * status viram toast com retry no hook — a página não precisa tratá-los.
 */
export class StructureFormError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "StructureFormError";
    this.status = status;
  }
}

/** O Core devolve erros como mapa string→string (ex.: `{ name: "obrigatório" }`). */
function isErrorBodyMap(v: unknown): v is Record<string, string> {
  if (typeof v !== "object" || v === null) return false;
  const values = Object.values(v);
  return values.length > 0 && values.every((x) => typeof x === "string");
}

/**
 * Converte `(status, body)` do openapi-fetch em `StructureFormError`.
 * 400 com mapa de strings → primeira mensagem; qualquer outro caso →
 * `fallback (HTTP N)` para não engolir o status.
 */
export function toStructureError(
  status: number,
  body: unknown,
  fallback: string,
): StructureFormError {
  if (status === 400 && isErrorBodyMap(body)) {
    const first = Object.values(body)[0];
    if (first !== undefined) return new StructureFormError(status, first);
  }
  return new StructureFormError(status, `${fallback} (HTTP ${String(status)})`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/structure/block.test.ts src/features/structure/unit.test.ts src/features/structure/structureError.test.ts`
Expected: PASS (10 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/structure/block.ts src/features/structure/block.test.ts src/features/structure/unit.ts src/features/structure/unit.test.ts src/features/structure/structureError.ts src/features/structure/structureError.test.ts
git commit -m "feat(plan-8-1): tipos Block/Unit + mappers + StructureFormError"
```

---

## Task 2: Hooks de leitura — `useBlocks` e `useUnits`

Query keys hierárquicas: `["blocks", condoId]` e `["units", condoId, blockId ?? "all"]` — a invalidação por prefixo `["units", condoId]` pega todas as variantes de filtro. Sem header explícito (middleware injeta `X-Condo-ID`). `refetch` exposto para o botão "Tentar novamente" das páginas.

**Files:**

- Create: `src/features/structure/useBlocks.ts`
- Create: `src/features/structure/useUnits.ts`
- Test: `src/features/structure/useBlocks.test.tsx`
- Test: `src/features/structure/useUnits.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/features/structure/useBlocks.test.tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { GET: mockGet } }));

import { useBlocks } from "./useBlocks";

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

describe("useBlocks", () => {
  it("busca GET /blocks e mapeia apenas itens válidos", async () => {
    mockGet.mockResolvedValue({
      data: [
        { id: "b1", name: "Torre A", description: "Frente" },
        { id: "b2", name: "Torre B" },
        { id: "b3" }, // inválido — sem name
      ],
      error: undefined,
    });

    const { result } = renderHook(() => useBlocks("c1"), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mockGet).toHaveBeenCalledWith("/blocks");
    expect(result.current.blocks).toEqual([
      { id: "b1", name: "Torre A", description: "Frente" },
      { id: "b2", name: "Torre B" },
    ]);
  });

  it("propaga isError quando o Core falha", async () => {
    mockGet.mockResolvedValue({ data: undefined, error: { message: "boom" } });
    const { result } = renderHook(() => useBlocks("c1"), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

```tsx
// src/features/structure/useUnits.test.tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { GET: mockGet } }));

import { useUnits } from "./useUnits";

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

describe("useUnits", () => {
  it("sem blockId: query vazia (lista tudo do condo)", async () => {
    mockGet.mockResolvedValue({
      data: [{ id: "u1", block_id: "b1", number: "101", floor: 1 }],
      error: undefined,
    });

    const { result } = renderHook(() => useUnits("c1"), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mockGet).toHaveBeenCalledWith("/units", { params: { query: {} } });
    expect(result.current.units).toEqual([{ id: "u1", blockId: "b1", number: "101", floor: 1 }]);
  });

  it("com blockId: passa o filtro via query param", async () => {
    mockGet.mockResolvedValue({ data: [], error: undefined });

    const { result } = renderHook(() => useUnits("c1", "b1"), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mockGet).toHaveBeenCalledWith("/units", { params: { query: { block_id: "b1" } } });
  });

  it("filtra itens inválidos e propaga erro", async () => {
    mockGet.mockResolvedValue({
      data: [{ id: "u1", block_id: "b1", number: "101" }, { id: "u2" }],
      error: undefined,
    });
    const { result } = renderHook(() => useUnits("c1"), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.units).toHaveLength(1);

    mockGet.mockResolvedValue({ data: undefined, error: { message: "boom" } });
    const { result: r2 } = renderHook(() => useUnits("c1", "b9"), {
      wrapper: wrapper(mkClient()),
    });
    await waitFor(() => expect(r2.current.isError).toBe(true));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/structure/useBlocks.test.tsx src/features/structure/useUnits.test.tsx`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Write minimal implementations**

```ts
// src/features/structure/useBlocks.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { toBlock, type Block } from "./block";

async function fetchBlocks(): Promise<Block[]> {
  const { data, error } = await api.GET("/blocks");
  if (error) {
    throw new Error("StructureService.fetchBlocks: falha em GET /blocks", { cause: error });
  }
  return (data ?? []).map(toBlock).filter((b): b is Block => b !== null);
}

export function useBlocks(condoId: string) {
  const query = useQuery({
    queryKey: ["blocks", condoId] as const,
    queryFn: fetchBlocks,
    staleTime: 5 * 60_000,
  });
  return {
    blocks: query.data,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}
```

```ts
// src/features/structure/useUnits.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { toUnit, type Unit } from "./unit";

async function fetchUnits(blockId?: string): Promise<Unit[]> {
  const query: { block_id?: string } = blockId !== undefined ? { block_id: blockId } : {};
  const { data, error } = await api.GET("/units", { params: { query } });
  if (error) {
    throw new Error("StructureService.fetchUnits: falha em GET /units", { cause: error });
  }
  return (data ?? []).map(toUnit).filter((u): u is Unit => u !== null);
}

/**
 * Lista unidades do condo ativo, opcionalmente filtradas por bloco.
 * Key ["units", condoId, blockId | "all"] — invalidar por prefixo ["units", condoId].
 */
export function useUnits(condoId: string, blockId?: string) {
  const query = useQuery({
    queryKey: ["units", condoId, blockId ?? "all"] as const,
    queryFn: () => fetchUnits(blockId),
    staleTime: 5 * 60_000,
  });
  return {
    units: query.data,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/structure/useBlocks.test.tsx src/features/structure/useUnits.test.tsx`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/structure/useBlocks.ts src/features/structure/useBlocks.test.tsx src/features/structure/useUnits.ts src/features/structure/useUnits.test.tsx
git commit -m "feat(plan-8-1): hooks de leitura useBlocks/useUnits"
```

---

## Task 3: Mutations de bloco — `useCreateBlock`, `useUpdateBlock`, `useDeleteBlock`

Padrão de toast no hook (como `useClaimTicket`): `notify.success` no `onSuccess`; `notify.error` com retry no `onError` — **exceto erro 400**, que vai para o banner do modal via `formError` exposto (toast de 400 duplicaria a mensagem inline). `useDeleteBlock` invalida **blocks + units** por causa do CASCADE, e sempre faz toast em erro (delete não tem form visível).

**Files:**

- Create: `src/features/structure/useCreateBlock.ts`
- Create: `src/features/structure/useUpdateBlock.ts`
- Create: `src/features/structure/useDeleteBlock.ts`
- Test: `src/features/structure/useCreateBlock.test.tsx`
- Test: `src/features/structure/useUpdateBlock.test.tsx`
- Test: `src/features/structure/useDeleteBlock.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/features/structure/useCreateBlock.test.tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPost, mockSuccess, mockError } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));
vi.mock("@/api/client", () => ({ api: { POST: mockPost } }));
vi.mock("@/lib/notify", () => ({ notify: { success: mockSuccess, error: mockError } }));

import { useCreateBlock } from "./useCreateBlock";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

afterEach(() => {
  mockPost.mockReset();
  mockSuccess.mockReset();
  mockError.mockReset();
  vi.restoreAllMocks();
});

describe("useCreateBlock", () => {
  it("POST /blocks omite description ausente, faz toast e invalida a query do condo", async () => {
    mockPost.mockResolvedValue({
      data: { id: "b1", name: "Torre A" },
      error: undefined,
      response: new Response(null, { status: 201 }),
    });
    const qc = mkClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useCreateBlock("c1"), { wrapper: wrapper(qc) });
    act(() => result.current.createBlock({ name: "Torre A" }));

    await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith("Bloco criado"));
    expect(mockPost).toHaveBeenCalledWith("/blocks", { body: { name: "Torre A" } });
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["blocks", "c1"] }));
  });

  it("400 expõe formError para o banner e NÃO faz toast", async () => {
    mockPost.mockResolvedValue({
      data: undefined,
      error: { name: "Nome é obrigatório" },
      response: new Response(null, { status: 400 }),
    });
    const { result } = renderHook(() => useCreateBlock("c1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.createBlock({ name: "" }));

    await waitFor(() => expect(result.current.formError).toBe("Nome é obrigatório"));
    expect(mockError).not.toHaveBeenCalled();
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it("erro não-400 faz toast com retry", async () => {
    mockPost.mockResolvedValue({
      data: undefined,
      error: { message: "boom" },
      response: new Response(null, { status: 500 }),
    });
    const { result } = renderHook(() => useCreateBlock("c1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.createBlock({ name: "Torre A" }));

    await waitFor(() =>
      expect(mockError).toHaveBeenCalledWith(
        "Não foi possível criar o bloco",
        expect.objectContaining({ retry: expect.any(Function) }),
      ),
    );
  });
});
```

```tsx
// src/features/structure/useUpdateBlock.test.tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPatch, mockSuccess, mockError } = vi.hoisted(() => ({
  mockPatch: vi.fn(),
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));
vi.mock("@/api/client", () => ({ api: { PATCH: mockPatch } }));
vi.mock("@/lib/notify", () => ({ notify: { success: mockSuccess, error: mockError } }));

import { useUpdateBlock } from "./useUpdateBlock";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

afterEach(() => {
  mockPatch.mockReset();
  mockSuccess.mockReset();
  mockError.mockReset();
  vi.restoreAllMocks();
});

describe("useUpdateBlock", () => {
  it("PATCH /blocks/{id} envia description vazia para limpar o campo", async () => {
    mockPatch.mockResolvedValue({
      data: { id: "b1", name: "Torre A" },
      error: undefined,
      response: new Response(null, { status: 200 }),
    });
    const qc = mkClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useUpdateBlock("c1"), { wrapper: wrapper(qc) });
    act(() => result.current.updateBlock({ id: "b1", name: "Torre A", description: "" }));

    await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith("Bloco atualizado"));
    expect(mockPatch).toHaveBeenCalledWith("/blocks/{id}", {
      params: { path: { id: "b1" } },
      body: { name: "Torre A", description: "" },
    });
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["blocks", "c1"] }));
  });

  it("400 expõe formError sem toast", async () => {
    mockPatch.mockResolvedValue({
      data: undefined,
      error: { name: "Nome é obrigatório" },
      response: new Response(null, { status: 400 }),
    });
    const { result } = renderHook(() => useUpdateBlock("c1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.updateBlock({ id: "b1", name: "", description: "" }));

    await waitFor(() => expect(result.current.formError).toBe("Nome é obrigatório"));
    expect(mockError).not.toHaveBeenCalled();
  });
});
```

```tsx
// src/features/structure/useDeleteBlock.test.tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockDelete, mockSuccess, mockError } = vi.hoisted(() => ({
  mockDelete: vi.fn(),
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));
vi.mock("@/api/client", () => ({ api: { DELETE: mockDelete } }));
vi.mock("@/lib/notify", () => ({ notify: { success: mockSuccess, error: mockError } }));

import { useDeleteBlock } from "./useDeleteBlock";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

afterEach(() => {
  mockDelete.mockReset();
  mockSuccess.mockReset();
  mockError.mockReset();
  vi.restoreAllMocks();
});

describe("useDeleteBlock", () => {
  it("DELETE /blocks/{id} invalida blocks E units (CASCADE no Core)", async () => {
    mockDelete.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: new Response(null, { status: 204 }),
    });
    const qc = mkClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useDeleteBlock("c1"), { wrapper: wrapper(qc) });
    act(() => result.current.deleteBlock({ id: "b1" }));

    await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith("Bloco excluído"));
    expect(mockDelete).toHaveBeenCalledWith("/blocks/{id}", { params: { path: { id: "b1" } } });
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["blocks", "c1"] }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["units", "c1"] }));
  });

  it("falha no delete faz toast com retry (sem exceção de 400)", async () => {
    mockDelete.mockResolvedValue({
      data: undefined,
      error: { message: "boom" },
      response: new Response(null, { status: 500 }),
    });
    const { result } = renderHook(() => useDeleteBlock("c1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.deleteBlock({ id: "b1" }));

    await waitFor(() =>
      expect(mockError).toHaveBeenCalledWith(
        "Não foi possível excluir o bloco",
        expect.objectContaining({ retry: expect.any(Function) }),
      ),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/structure/useCreateBlock.test.tsx src/features/structure/useUpdateBlock.test.tsx src/features/structure/useDeleteBlock.test.tsx`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Write minimal implementations**

```ts
// src/features/structure/useCreateBlock.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";
import { toBlock, type Block } from "./block";
import { StructureFormError, toStructureError } from "./structureError";

export interface CreateBlockInput {
  name: string;
  description?: string;
}

export function useCreateBlock(condoId: string) {
  const qc = useQueryClient();
  const m = useMutation<Block, StructureFormError | Error, CreateBlockInput>({
    mutationFn: async (input) => {
      const { data, error, response } = await api.POST("/blocks", {
        body: {
          name: input.name,
          ...(input.description !== undefined ? { description: input.description } : {}),
        },
      });
      if (error || !data) {
        throw toStructureError(response.status, error, "Falha ao criar bloco");
      }
      const block = toBlock(data);
      if (!block) {
        throw new Error("StructureService.createBlock: payload incompleto em POST /blocks");
      }
      return block;
    },
    onSuccess: () => {
      notify.success("Bloco criado");
      void qc.invalidateQueries({ queryKey: ["blocks", condoId] });
    },
    onError: (err, vars) => {
      // 400 → banner inline no modal (formError); toast duplicaria a mensagem.
      if (err instanceof StructureFormError && err.status === 400) return;
      notify.error("Não foi possível criar o bloco", { retry: () => m.mutate(vars) });
    },
  });

  return {
    createBlock: (input: CreateBlockInput, opts?: { onSuccess?: () => void }) =>
      m.mutate(input, opts),
    isPending: m.isPending,
    formError: m.error instanceof StructureFormError ? m.error.message : null,
    isError: m.isError,
  };
}
```

```ts
// src/features/structure/useUpdateBlock.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";
import { toBlock, type Block } from "./block";
import { StructureFormError, toStructureError } from "./structureError";

export interface UpdateBlockInput {
  id: string;
  name: string;
  /** Enviada sempre (inclusive "") — PATCH parcial permite limpar a descrição. */
  description: string;
}

export function useUpdateBlock(condoId: string) {
  const qc = useQueryClient();
  const m = useMutation<Block, StructureFormError | Error, UpdateBlockInput>({
    mutationFn: async (input) => {
      const { data, error, response } = await api.PATCH("/blocks/{id}", {
        params: { path: { id: input.id } },
        body: { name: input.name, description: input.description },
      });
      if (error || !data) {
        throw toStructureError(response.status, error, "Falha ao atualizar bloco");
      }
      const block = toBlock(data);
      if (!block) {
        throw new Error("StructureService.updateBlock: payload incompleto em PATCH /blocks/{id}");
      }
      return block;
    },
    onSuccess: () => {
      notify.success("Bloco atualizado");
      void qc.invalidateQueries({ queryKey: ["blocks", condoId] });
    },
    onError: (err, vars) => {
      if (err instanceof StructureFormError && err.status === 400) return;
      notify.error("Não foi possível atualizar o bloco", { retry: () => m.mutate(vars) });
    },
  });

  return {
    updateBlock: (input: UpdateBlockInput, opts?: { onSuccess?: () => void }) =>
      m.mutate(input, opts),
    isPending: m.isPending,
    formError: m.error instanceof StructureFormError ? m.error.message : null,
    isError: m.isError,
  };
}
```

```ts
// src/features/structure/useDeleteBlock.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";
import { StructureFormError, toStructureError } from "./structureError";

export interface DeleteBlockInput {
  id: string;
}

/**
 * DELETE /blocks/{id} → 204. O Core remove em CASCADE as unidades do bloco,
 * por isso invalida blocks E units do condo.
 */
export function useDeleteBlock(condoId: string) {
  const qc = useQueryClient();
  const m = useMutation<void, StructureFormError | Error, DeleteBlockInput>({
    mutationFn: async ({ id }) => {
      const { error, response } = await api.DELETE("/blocks/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw toStructureError(response.status, error, "Falha ao excluir bloco");
      }
    },
    onSuccess: () => {
      notify.success("Bloco excluído");
      void qc.invalidateQueries({ queryKey: ["blocks", condoId] });
      void qc.invalidateQueries({ queryKey: ["units", condoId] });
    },
    onError: (_err, vars) => {
      // Delete não tem form visível — sempre toast, inclusive em 400.
      notify.error("Não foi possível excluir o bloco", { retry: () => m.mutate(vars) });
    },
  });

  return {
    deleteBlock: (input: DeleteBlockInput, opts?: { onSuccess?: () => void }) =>
      m.mutate(input, opts),
    isPending: m.isPending,
    isError: m.isError,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/structure/useCreateBlock.test.tsx src/features/structure/useUpdateBlock.test.tsx src/features/structure/useDeleteBlock.test.tsx`
Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/structure/useCreateBlock.ts src/features/structure/useCreateBlock.test.tsx src/features/structure/useUpdateBlock.ts src/features/structure/useUpdateBlock.test.tsx src/features/structure/useDeleteBlock.ts src/features/structure/useDeleteBlock.test.tsx
git commit -m "feat(plan-8-1): mutations de bloco com toasts e invalidação (delete cascateia units)"
```

---

## Task 4: Mutations de unidade — `useCreateUnit`, `useUpdateUnit`, `useDeleteUnit`

Mesma forma das de bloco. Diferenças: `block_id` só existe no create (body); update nunca envia `block_id` (Core não permite trocar); `floor` omitido quando `undefined` (API não tem nullable — **floor setado não pode ser limpo depois**, limitação documentada do Core). Delete invalida só `["units", condoId]` (prefixo cobre as variantes de filtro).

**Files:**

- Create: `src/features/structure/useCreateUnit.ts`
- Create: `src/features/structure/useUpdateUnit.ts`
- Create: `src/features/structure/useDeleteUnit.ts`
- Test: `src/features/structure/useCreateUnit.test.tsx`
- Test: `src/features/structure/useUpdateUnit.test.tsx`
- Test: `src/features/structure/useDeleteUnit.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/features/structure/useCreateUnit.test.tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPost, mockSuccess, mockError } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));
vi.mock("@/api/client", () => ({ api: { POST: mockPost } }));
vi.mock("@/lib/notify", () => ({ notify: { success: mockSuccess, error: mockError } }));

import { useCreateUnit } from "./useCreateUnit";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

afterEach(() => {
  mockPost.mockReset();
  mockSuccess.mockReset();
  mockError.mockReset();
  vi.restoreAllMocks();
});

describe("useCreateUnit", () => {
  it("POST /units envia block_id no body e omite floor ausente", async () => {
    mockPost.mockResolvedValue({
      data: { id: "u1", block_id: "b1", number: "101" },
      error: undefined,
      response: new Response(null, { status: 201 }),
    });
    const qc = mkClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useCreateUnit("c1"), { wrapper: wrapper(qc) });
    act(() => result.current.createUnit({ blockId: "b1", number: "101" }));

    await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith("Unidade criada"));
    expect(mockPost).toHaveBeenCalledWith("/units", {
      body: { block_id: "b1", number: "101" },
    });
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["units", "c1"] }));
  });

  it("envia floor quando informado", async () => {
    mockPost.mockResolvedValue({
      data: { id: "u1", block_id: "b1", number: "203", floor: 2 },
      error: undefined,
      response: new Response(null, { status: 201 }),
    });
    const { result } = renderHook(() => useCreateUnit("c1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.createUnit({ blockId: "b1", number: "203", floor: 2 }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/units", {
        body: { block_id: "b1", number: "203", floor: 2 },
      }),
    );
  });

  it("400 expõe formError sem toast", async () => {
    mockPost.mockResolvedValue({
      data: undefined,
      error: { number: "Número já existe neste bloco" },
      response: new Response(null, { status: 400 }),
    });
    const { result } = renderHook(() => useCreateUnit("c1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.createUnit({ blockId: "b1", number: "101" }));

    await waitFor(() => expect(result.current.formError).toBe("Número já existe neste bloco"));
    expect(mockError).not.toHaveBeenCalled();
  });
});
```

```tsx
// src/features/structure/useUpdateUnit.test.tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPatch, mockSuccess, mockError } = vi.hoisted(() => ({
  mockPatch: vi.fn(),
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));
vi.mock("@/api/client", () => ({ api: { PATCH: mockPatch } }));
vi.mock("@/lib/notify", () => ({ notify: { success: mockSuccess, error: mockError } }));

import { useUpdateUnit } from "./useUpdateUnit";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

afterEach(() => {
  mockPatch.mockReset();
  mockSuccess.mockReset();
  mockError.mockReset();
  vi.restoreAllMocks();
});

describe("useUpdateUnit", () => {
  it("PATCH /units/{id} envia number+floor e NUNCA block_id", async () => {
    mockPatch.mockResolvedValue({
      data: { id: "u1", block_id: "b1", number: "204", floor: 2 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    });
    const qc = mkClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useUpdateUnit("c1"), { wrapper: wrapper(qc) });
    act(() => result.current.updateUnit({ id: "u1", number: "204", floor: 2 }));

    await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith("Unidade atualizada"));
    expect(mockPatch).toHaveBeenCalledWith("/units/{id}", {
      params: { path: { id: "u1" } },
      body: { number: "204", floor: 2 },
    });
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["units", "c1"] }));
  });

  it("omite floor quando não informado (não limpa o valor no Core)", async () => {
    mockPatch.mockResolvedValue({
      data: { id: "u1", block_id: "b1", number: "204", floor: 2 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    });
    const { result } = renderHook(() => useUpdateUnit("c1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.updateUnit({ id: "u1", number: "204" }));

    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith("/units/{id}", {
        params: { path: { id: "u1" } },
        body: { number: "204" },
      }),
    );
  });
});
```

```tsx
// src/features/structure/useDeleteUnit.test.tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockDelete, mockSuccess, mockError } = vi.hoisted(() => ({
  mockDelete: vi.fn(),
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));
vi.mock("@/api/client", () => ({ api: { DELETE: mockDelete } }));
vi.mock("@/lib/notify", () => ({ notify: { success: mockSuccess, error: mockError } }));

import { useDeleteUnit } from "./useDeleteUnit";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

afterEach(() => {
  mockDelete.mockReset();
  mockSuccess.mockReset();
  mockError.mockReset();
  vi.restoreAllMocks();
});

describe("useDeleteUnit", () => {
  it("DELETE /units/{id} invalida só units (SET NULL nos residents)", async () => {
    mockDelete.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: new Response(null, { status: 204 }),
    });
    const qc = mkClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useDeleteUnit("c1"), { wrapper: wrapper(qc) });
    act(() => result.current.deleteUnit({ id: "u1" }));

    await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith("Unidade excluída"));
    expect(mockDelete).toHaveBeenCalledWith("/units/{id}", { params: { path: { id: "u1" } } });
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["units", "c1"] }));
    expect(spy).not.toHaveBeenCalledWith({ queryKey: ["blocks", "c1"] });
  });

  it("falha no delete faz toast com retry", async () => {
    mockDelete.mockResolvedValue({
      data: undefined,
      error: { message: "boom" },
      response: new Response(null, { status: 500 }),
    });
    const { result } = renderHook(() => useDeleteUnit("c1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.deleteUnit({ id: "u1" }));

    await waitFor(() =>
      expect(mockError).toHaveBeenCalledWith(
        "Não foi possível excluir a unidade",
        expect.objectContaining({ retry: expect.any(Function) }),
      ),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/structure/useCreateUnit.test.tsx src/features/structure/useUpdateUnit.test.tsx src/features/structure/useDeleteUnit.test.tsx`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Write minimal implementations**

```ts
// src/features/structure/useCreateUnit.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";
import { toUnit, type Unit } from "./unit";
import { StructureFormError, toStructureError } from "./structureError";

export interface CreateUnitInput {
  blockId: string;
  number: string;
  floor?: number;
}

export function useCreateUnit(condoId: string) {
  const qc = useQueryClient();
  const m = useMutation<Unit, StructureFormError | Error, CreateUnitInput>({
    mutationFn: async (input) => {
      const { data, error, response } = await api.POST("/units", {
        body: {
          block_id: input.blockId,
          number: input.number,
          ...(input.floor !== undefined ? { floor: input.floor } : {}),
        },
      });
      if (error || !data) {
        throw toStructureError(response.status, error, "Falha ao criar unidade");
      }
      const unit = toUnit(data);
      if (!unit) {
        throw new Error("StructureService.createUnit: payload incompleto em POST /units");
      }
      return unit;
    },
    onSuccess: () => {
      notify.success("Unidade criada");
      void qc.invalidateQueries({ queryKey: ["units", condoId] });
    },
    onError: (err, vars) => {
      if (err instanceof StructureFormError && err.status === 400) return;
      notify.error("Não foi possível criar a unidade", { retry: () => m.mutate(vars) });
    },
  });

  return {
    createUnit: (input: CreateUnitInput, opts?: { onSuccess?: () => void }) =>
      m.mutate(input, opts),
    isPending: m.isPending,
    formError: m.error instanceof StructureFormError ? m.error.message : null,
    isError: m.isError,
  };
}
```

```ts
// src/features/structure/useUpdateUnit.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";
import { toUnit, type Unit } from "./unit";
import { StructureFormError, toStructureError } from "./structureError";

export interface UpdateUnitInput {
  id: string;
  number: string;
  /** Omitido = não altera. Core não aceita null — floor setado não pode ser limpo. */
  floor?: number;
}

/**
 * PATCH /units/{id}. O Core não permite trocar a unidade de bloco
 * (UpdateUnitRequest não tem block_id) — por isso o select de bloco
 * não aparece no modo de edição do UnitFormModal.
 */
export function useUpdateUnit(condoId: string) {
  const qc = useQueryClient();
  const m = useMutation<Unit, StructureFormError | Error, UpdateUnitInput>({
    mutationFn: async (input) => {
      const { data, error, response } = await api.PATCH("/units/{id}", {
        params: { path: { id: input.id } },
        body: {
          number: input.number,
          ...(input.floor !== undefined ? { floor: input.floor } : {}),
        },
      });
      if (error || !data) {
        throw toStructureError(response.status, error, "Falha ao atualizar unidade");
      }
      const unit = toUnit(data);
      if (!unit) {
        throw new Error("StructureService.updateUnit: payload incompleto em PATCH /units/{id}");
      }
      return unit;
    },
    onSuccess: () => {
      notify.success("Unidade atualizada");
      void qc.invalidateQueries({ queryKey: ["units", condoId] });
    },
    onError: (err, vars) => {
      if (err instanceof StructureFormError && err.status === 400) return;
      notify.error("Não foi possível atualizar a unidade", { retry: () => m.mutate(vars) });
    },
  });

  return {
    updateUnit: (input: UpdateUnitInput, opts?: { onSuccess?: () => void }) =>
      m.mutate(input, opts),
    isPending: m.isPending,
    formError: m.error instanceof StructureFormError ? m.error.message : null,
    isError: m.isError,
  };
}
```

```ts
// src/features/structure/useDeleteUnit.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";
import { StructureFormError, toStructureError } from "./structureError";

export interface DeleteUnitInput {
  id: string;
}

/**
 * DELETE /units/{id} → 204. O Core faz SET NULL em residents.unit_id —
 * nenhuma outra query do dashboard depende disso hoje, então só units
 * é invalidada.
 */
export function useDeleteUnit(condoId: string) {
  const qc = useQueryClient();
  const m = useMutation<void, StructureFormError | Error, DeleteUnitInput>({
    mutationFn: async ({ id }) => {
      const { error, response } = await api.DELETE("/units/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw toStructureError(response.status, error, "Falha ao excluir unidade");
      }
    },
    onSuccess: () => {
      notify.success("Unidade excluída");
      void qc.invalidateQueries({ queryKey: ["units", condoId] });
    },
    onError: (_err, vars) => {
      notify.error("Não foi possível excluir a unidade", { retry: () => m.mutate(vars) });
    },
  });

  return {
    deleteUnit: (input: DeleteUnitInput, opts?: { onSuccess?: () => void }) =>
      m.mutate(input, opts),
    isPending: m.isPending,
    isError: m.isError,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/structure/useCreateUnit.test.tsx src/features/structure/useUpdateUnit.test.tsx src/features/structure/useDeleteUnit.test.tsx`
Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/structure/useCreateUnit.ts src/features/structure/useCreateUnit.test.tsx src/features/structure/useUpdateUnit.ts src/features/structure/useUpdateUnit.test.tsx src/features/structure/useDeleteUnit.ts src/features/structure/useDeleteUnit.test.tsx
git commit -m "feat(plan-8-1): mutations de unidade (block_id só no create)"
```

---

## Task 5: `BlockFormModal` (create/edit)

Modal local com estado por campo. `block: Block | null` — `null` = criação. A página renderiza condicionalmente (`{formState !== null && <BlockFormModal …/>}`), então o estado inicial vem das props no mount — sem `useEffect` de sincronização. Erro 400 aparece em banner `role="alert"` no topo do form; o modal **permanece aberto** em qualquer erro (toast cobre os não-400).

**Files:**

- Create: `src/features/structure/BlockFormModal.tsx`
- Create: `src/features/structure/BlockFormModal.module.css`
- Test: `src/features/structure/BlockFormModal.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/structure/BlockFormModal.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
      expect.objectContaining({ onSuccess: expect.any(Function) }),
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
      expect.objectContaining({ onSuccess: expect.any(Function) }),
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
```

> `getByLabelText(/^nome$/i)` exige associação label↔input via `htmlFor`/`id` (a regex `^nome$` evita casar com "Descrição"). A implementação abaixo já faz isso.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/structure/BlockFormModal.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/structure/BlockFormModal.tsx
import { useState, type FormEvent } from "react";
import { Button } from "@/ui/Button/Button";
import { Modal } from "@/ui/Modal/Modal";
import type { Block } from "./block";
import { useCreateBlock } from "./useCreateBlock";
import { useUpdateBlock } from "./useUpdateBlock";
import styles from "./BlockFormModal.module.css";

interface BlockFormModalProps {
  condoId: string;
  /** null = criação; presente = edição (campos pré-preenchidos). */
  block: Block | null;
  onClose: () => void;
}

export function BlockFormModal({ condoId, block, onClose }: BlockFormModalProps) {
  const [name, setName] = useState(block?.name ?? "");
  const [description, setDescription] = useState(block?.description ?? "");
  const { createBlock, isPending: creating, formError: createError } = useCreateBlock(condoId);
  const { updateBlock, isPending: updating, formError: updateError } = useUpdateBlock(condoId);

  const isPending = creating || updating;
  const formError = block !== null ? updateError : createError;
  const canSubmit = name.trim() !== "" && !isPending;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    const desc = description.trim();
    if (block !== null) {
      // Edição envia description sempre ("" limpa o campo no PATCH parcial).
      updateBlock({ id: block.id, name: name.trim(), description: desc }, { onSuccess: onClose });
    } else {
      createBlock(
        { name: name.trim(), ...(desc !== "" ? { description: desc } : {}) },
        { onSuccess: onClose },
      );
    }
  }

  return (
    <Modal open onClose={onClose} title={block !== null ? "Editar bloco" : "Novo bloco"}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {formError !== null && (
          <p role="alert" className={styles.banner}>
            {formError}
          </p>
        )}
        <div className={styles.field}>
          <label htmlFor="block-name" className={styles.label}>
            Nome
          </label>
          <input
            id="block-name"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            placeholder="Ex.: Torre A"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="block-description" className={styles.label}>
            Descrição (opcional)
          </label>
          <input
            id="block-description"
            className={styles.input}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={120}
            placeholder="Ex.: Bloco da frente, perto da portaria"
          />
        </div>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {isPending ? "Salvando…" : block !== null ? "Salvar" : "Criar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

```css
/* src/features/structure/BlockFormModal.module.css */
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.banner {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--danger-soft-bg);
  color: var(--danger-soft-fg);
  font-size: var(--fs-sm);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.label {
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  color: var(--fg-secondary);
}

.input {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  color: var(--fg-primary);
  font-size: var(--fs-base);
}

.input:focus {
  outline: none;
  border-color: var(--brand);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
```

> O `UnitFormModal` (Task 9) usa as mesmas classes — se as duas CSS Modules ficarem idênticas, extrair `structureForm.module.css` compartilhado na Task 9 em vez de duplicar (decisão do implementador; testes não dependem de classes).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/structure/BlockFormModal.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/structure/BlockFormModal.tsx src/features/structure/BlockFormModal.module.css src/features/structure/BlockFormModal.test.tsx
git commit -m "feat(plan-8-1): BlockFormModal create/edit com banner de erro 400"
```

---

## Task 6: `DeleteBlockDialog` (copy CASCADE)

Confirmação destrutiva sobre o `Modal` (padrão `RejectConfirmDialog`): entidade em estado na página, `if (!block) return null`, título com nome, copy explicando a consequência. Recebe `unitCount` quando a página tem os dados (derivados de `useUnits`); sem contagem, cai na copy genérica.

**Files:**

- Create: `src/features/structure/DeleteBlockDialog.tsx`
- Create: `src/features/structure/DeleteBlockDialog.module.css`
- Test: `src/features/structure/DeleteBlockDialog.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/structure/DeleteBlockDialog.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteBlockDialog } from "./DeleteBlockDialog";
import type { Block } from "./block";

const BLOCK: Block = { id: "b1", name: "Torre A" };

describe("DeleteBlockDialog", () => {
  it("não renderiza quando block é null", () => {
    render(<DeleteBlockDialog block={null} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("mostra o nome no título e a contagem de unidades quando disponível", () => {
    render(
      <DeleteBlockDialog block={BLOCK} unitCount={24} onCancel={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(screen.getByText(/Excluir Torre A\?/i)).toBeInTheDocument();
    expect(screen.getByText(/24 unidades/i)).toBeInTheDocument();
  });

  it("usa copy genérica sem contagem", () => {
    render(<DeleteBlockDialog block={BLOCK} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText(/todas as unidades vinculadas/i)).toBeInTheDocument();
  });

  it("confirma e cancela", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<DeleteBlockDialog block={BLOCK} onCancel={onCancel} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/structure/DeleteBlockDialog.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/structure/DeleteBlockDialog.tsx
import { Button } from "@/ui/Button/Button";
import { Modal } from "@/ui/Modal/Modal";
import type { Block } from "./block";
import styles from "./DeleteBlockDialog.module.css";

interface DeleteBlockDialogProps {
  block: Block | null;
  /** Contagem real de unidades do bloco, quando a página já tem os dados. */
  unitCount?: number;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteBlockDialog({
  block,
  unitCount,
  busy = false,
  onCancel,
  onConfirm,
}: DeleteBlockDialogProps) {
  if (!block) return null;
  return (
    <Modal open onClose={onCancel} title={`Excluir ${block.name}?`}>
      <p className={styles.copy}>
        {unitCount !== undefined && unitCount > 0 ? (
          <>
            Isso removerá o bloco e suas{" "}
            <strong>
              {unitCount} unidade{unitCount > 1 ? "s" : ""}
            </strong>
            .{" "}
          </>
        ) : (
          "Isso removerá o bloco e todas as unidades vinculadas a ele. "
        )}
        Moradores não são removidos. Essa ação não pode ser desfeita.
      </p>
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          {busy ? "Excluindo…" : "Excluir"}
        </Button>
      </div>
    </Modal>
  );
}
```

```css
/* src/features/structure/DeleteBlockDialog.module.css */
.copy {
  margin: 0;
  color: var(--fg-secondary);
  font-size: var(--fs-sm);
  line-height: var(--lh-relaxed);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
```

> `DeleteUnitDialog` (Task 10) usa a mesma CSS — importar `DeleteBlockDialog.module.css` lá em vez de duplicar o arquivo (renomear para `DeleteConfirmDialog.module.css` se preferir um nome neutro; decidir na Task 10 e ajustar o import aqui).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/structure/DeleteBlockDialog.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/structure/DeleteBlockDialog.tsx src/features/structure/DeleteBlockDialog.module.css src/features/structure/DeleteBlockDialog.test.tsx
git commit -m "feat(plan-8-1): DeleteBlockDialog com copy de CASCADE"
```

---

## Task 7: `BlocksPage` (composição)

Header por convenção (`.header/.title/.sub/.actions`), estados (Spinner → erro `role="alert"` com retry → EmptyState com ação → lista), contagens de unidades derivadas de `useUnits` (falha na query de units degrada a contagem para "—", sem derrubar a página). Linhas de lista inline (sem componente Card — a página é o único consumidor). Botões de linha com `aria-label` por entidade (`Editar Torre A`) para testes robustos e a11y.

**Files:**

- Create: `src/features/structure/BlocksPage.tsx`
- Create: `src/features/structure/BlocksPage.module.css`
- Test: `src/features/structure/BlocksPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/structure/BlocksPage.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(screen.getByText(/novo bloco/i)).toBeInTheDocument();
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
    expect(screen.getByText(/Excluir Torre A\?/i)).toBeInTheDocument();
    expect(screen.getByText(/2 unidades/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }));
    expect(mockDeleteBlock).toHaveBeenCalledWith(
      { id: "b1" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/structure/BlocksPage.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/structure/BlocksPage.tsx
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/ui/Button/Button";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import { Spinner } from "@/ui/Spinner/Spinner";
import type { Block } from "./block";
import { useBlocks } from "./useBlocks";
import { useUnits } from "./useUnits";
import { useDeleteBlock } from "./useDeleteBlock";
import { BlockFormModal } from "./BlockFormModal";
import { DeleteBlockDialog } from "./DeleteBlockDialog";
import styles from "./BlocksPage.module.css";

interface BlocksPageProps {
  condoId: string;
}

type FormState = { mode: "create" } | { mode: "edit"; block: Block } | null;

function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? singular : pluralForm;
}

export function BlocksPage({ condoId }: BlocksPageProps) {
  const { blocks, isPending, isError, refetch } = useBlocks(condoId);
  // Contagens derivadas; falha em units NÃO derruba a página (degrada p/ "—").
  const { units } = useUnits(condoId);
  const { deleteBlock, isPending: deleting } = useDeleteBlock(condoId);

  const [formState, setFormState] = useState<FormState>(null);
  const [toDelete, setToDelete] = useState<Block | null>(null);

  const unitCountByBlock = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of units ?? []) map.set(u.blockId, (map.get(u.blockId) ?? 0) + 1);
    return map;
  }, [units]);

  function handleConfirmDelete() {
    if (!toDelete) return;
    deleteBlock({ id: toDelete.id }, { onSuccess: () => setToDelete(null) });
  }

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Blocos</h1>
          <p className={styles.sub}>
            {blocks !== undefined
              ? `${blocks.length} ${plural(blocks.length, "bloco", "blocos")} cadastrado${blocks.length === 1 ? "" : "s"}`
              : "Estrutura física do condomínio"}
          </p>
        </div>
        <div className={styles.actions}>
          <Button onClick={() => setFormState({ mode: "create" })}>
            <Plus size={14} /> Novo bloco
          </Button>
        </div>
      </header>

      {isPending ? (
        <Spinner />
      ) : isError ? (
        <EmptyState
          title="Não foi possível carregar os blocos"
          description="Verifique sua conexão e tente novamente."
          role="alert"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                void refetch();
              }}
            >
              Tentar novamente
            </Button>
          }
        />
      ) : blocks === undefined || blocks.length === 0 ? (
        <EmptyState
          title="Nenhum bloco cadastrado"
          description="Cadastre o primeiro bloco para organizar as unidades do condomínio."
          action={
            <Button onClick={() => setFormState({ mode: "create" })}>
              <Plus size={14} /> Cadastrar bloco
            </Button>
          }
        />
      ) : (
        <ul className={styles.list}>
          {blocks.map((b) => {
            const count = unitCountByBlock.get(b.id) ?? 0;
            return (
              <li key={b.id} className={styles.row}>
                <div className={styles.rowInfo}>
                  <span className={styles.rowTitle}>{b.name}</span>
                  <span className={styles.rowMeta}>
                    {b.description !== undefined ? `${b.description} · ` : ""}
                    {units === undefined ? "—" : `${count} ${plural(count, "unidade", "unidades")}`}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Editar ${b.name}`}
                    onClick={() => setFormState({ mode: "edit", block: b })}
                  >
                    <Pencil size={14} /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Excluir ${b.name}`}
                    onClick={() => setToDelete(b)}
                  >
                    <Trash2 size={14} /> Excluir
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {formState !== null && (
        <BlockFormModal
          condoId={condoId}
          block={formState.mode === "edit" ? formState.block : null}
          onClose={() => setFormState(null)}
        />
      )}

      <DeleteBlockDialog
        block={toDelete}
        {...(toDelete !== null && units !== undefined
          ? { unitCount: unitCountByBlock.get(toDelete.id) ?? 0 }
          : {})}
        busy={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
```

```css
/* src/features/structure/BlocksPage.module.css */
.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-5);
  margin-bottom: var(--space-5);
}

.title {
  margin: 0;
  font-size: var(--fs-2xl);
  font-weight: var(--fw-semibold);
  color: var(--fg-primary);
}

.sub {
  margin: 0;
  color: var(--fg-secondary);
  font-size: var(--fs-sm);
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
}

.rowInfo {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.rowTitle {
  font-weight: var(--fw-semibold);
  color: var(--fg-primary);
}

.rowMeta {
  font-size: var(--fs-sm);
  color: var(--fg-tertiary);
}

.rowActions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}
```

> `EmptyState` com `role="alert"`: confirmar que a prop `role` existe no componente (foi usada em `RouteError.tsx`). Se a assinatura divergir, ajustar para o padrão real do componente antes de rodar o teste.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/structure/BlocksPage.test.tsx`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/structure/BlocksPage.tsx src/features/structure/BlocksPage.module.css src/features/structure/BlocksPage.test.tsx
git commit -m "feat(plan-8-1): BlocksPage com contagens derivadas e modais"
```

---

## Task 8: Plugar a rota de blocos

Trocar o placeholder pela `BlocksPage`, mantendo o `beforeLoad: requireRole("manager")` intacto. Página recebe `condoId` por prop (padrão `CondoOverviewPage`) — facilita teste e mantém a página livre de dependência de router.

**Files:**

- Modify: `src/app/routes/_app/c/$condoId/structure/blocks.tsx`

- [ ] **Step 1: Atualizar a rota**

```tsx
// src/app/routes/_app/c/$condoId/structure/blocks.tsx
import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/routeGuards";
import { BlocksPage } from "@/features/structure/BlocksPage";

export const Route = createFileRoute("/_app/c/$condoId/structure/blocks")({
  beforeLoad: requireRole("manager"),
  component: function BlocksRoute() {
    const { condoId } = Route.useParams();
    return <BlocksPage condoId={condoId} />;
  },
});
```

- [ ] **Step 2: Smoke check de tipos**

Run: `npm run typecheck`
Expected: PASS sem erros novos.

- [ ] **Step 3: Commit**

```bash
git add 'src/app/routes/_app/c/$condoId/structure/blocks.tsx'
git commit -m "feat(plan-8-1): rota structure/blocks renderiza BlocksPage"
```

---

## Task 9: `UnitFormModal` (create/edit)

Três campos: **bloco** (select, só no create — Core não permite trocar via PATCH; no edit vira texto estático com o nome do bloco), **número** (texto, obrigatório), **andar** (`type="number"`, opcional, step 1). `floor` vazio → omitido do payload. Validação: `canSubmit` exige número preenchido, bloco selecionado (no create) e floor parseável quando preenchido.

**Files:**

- Create: `src/features/structure/UnitFormModal.tsx`
- Create: `src/features/structure/UnitFormModal.module.css`
- Test: `src/features/structure/UnitFormModal.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/structure/UnitFormModal.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
      expect.objectContaining({ onSuccess: expect.any(Function) }),
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
      expect.objectContaining({ onSuccess: expect.any(Function) }),
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
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
```

> Se `getByLabelText(/andar/i)` casar com mais de um elemento (improvável aqui), reforçar a regex para `/^andar/i`. O input `type="number"` com `userEvent.type` devolve string no `e.target.value` — o parse acontece no submit.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/structure/UnitFormModal.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/structure/UnitFormModal.tsx
import { useState, type FormEvent } from "react";
import { Button } from "@/ui/Button/Button";
import { Modal } from "@/ui/Modal/Modal";
import type { Block } from "./block";
import type { Unit } from "./unit";
import { useCreateUnit } from "./useCreateUnit";
import { useUpdateUnit } from "./useUpdateUnit";
import styles from "./UnitFormModal.module.css";

interface UnitFormModalProps {
  condoId: string;
  /** null = criação; presente = edição. */
  unit: Unit | null;
  /** Blocos do condo (select no create; lookup de nome no edit). */
  blocks: Block[];
  onClose: () => void;
}

function parseFloor(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const n = Number.parseInt(trimmed, 10);
  return Number.isNaN(n) ? undefined : n;
}

export function UnitFormModal({ condoId, unit, blocks, onClose }: UnitFormModalProps) {
  const [blockId, setBlockId] = useState(unit?.blockId ?? "");
  const [number, setNumber] = useState(unit?.number ?? "");
  const [floor, setFloor] = useState(unit?.floor !== undefined ? String(unit.floor) : "");
  const { createUnit, isPending: creating, formError: createError } = useCreateUnit(condoId);
  const { updateUnit, isPending: updating, formError: updateError } = useUpdateUnit(condoId);

  const isPending = creating || updating;
  const formError = unit !== null ? updateError : createError;
  const floorValid = floor.trim() === "" || parseFloor(floor) !== undefined;
  const canSubmit =
    number.trim() !== "" && (unit !== null || blockId !== "") && floorValid && !isPending;

  const blockName = unit !== null ? (blocks.find((b) => b.id === unit.blockId)?.name ?? "—") : null;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    const floorNum = parseFloor(floor);
    if (unit !== null) {
      updateUnit(
        {
          id: unit.id,
          number: number.trim(),
          ...(floorNum !== undefined ? { floor: floorNum } : {}),
        },
        { onSuccess: onClose },
      );
    } else {
      createUnit(
        {
          blockId,
          number: number.trim(),
          ...(floorNum !== undefined ? { floor: floorNum } : {}),
        },
        { onSuccess: onClose },
      );
    }
  }

  return (
    <Modal open onClose={onClose} title={unit !== null ? "Editar unidade" : "Nova unidade"}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {formError !== null && (
          <p role="alert" className={styles.banner}>
            {formError}
          </p>
        )}
        {unit !== null ? (
          <div className={styles.field}>
            <span className={styles.label}>Bloco</span>
            <span className={styles.staticValue}>{blockName}</span>
          </div>
        ) : (
          <div className={styles.field}>
            <label htmlFor="unit-block" className={styles.label}>
              Bloco
            </label>
            <select
              id="unit-block"
              className={styles.input}
              value={blockId}
              onChange={(e) => setBlockId(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={styles.field}>
          <label htmlFor="unit-number" className={styles.label}>
            Número
          </label>
          <input
            id="unit-number"
            className={styles.input}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            required
            maxLength={20}
            placeholder="Ex.: 101, 203, Sala 4"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="unit-floor" className={styles.label}>
            Andar (opcional)
          </label>
          <input
            id="unit-floor"
            className={styles.input}
            type="number"
            step={1}
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder="Ex.: 0 (térreo), 2"
          />
        </div>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {isPending ? "Salvando…" : unit !== null ? "Salvar" : "Criar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

```css
/* src/features/structure/UnitFormModal.module.css */
/* Se ficou idêntica à BlockFormModal.module.css (mais .staticValue), extrair
   structureForm.module.css compartilhado — ver nota na Task 5. */
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.banner {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--danger-soft-bg);
  color: var(--danger-soft-fg);
  font-size: var(--fs-sm);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.label {
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  color: var(--fg-secondary);
}

.staticValue {
  color: var(--fg-primary);
  font-size: var(--fs-base);
}

.input {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  color: var(--fg-primary);
  font-size: var(--fs-base);
}

.input:focus {
  outline: none;
  border-color: var(--brand);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/structure/UnitFormModal.test.tsx`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/structure/UnitFormModal.tsx src/features/structure/UnitFormModal.module.css src/features/structure/UnitFormModal.test.tsx
git commit -m "feat(plan-8-1): UnitFormModal (select bloco só no create)"
```

---

## Task 10: `DeleteUnitDialog` (copy SET NULL)

Mesmo padrão do `DeleteBlockDialog`. Copy: moradores vinculados ficam sem unidade (SET NULL documentado no Core). Reusar a CSS do `DeleteBlockDialog` (ver nota na Task 6).

**Files:**

- Create: `src/features/structure/DeleteUnitDialog.tsx`
- Test: `src/features/structure/DeleteUnitDialog.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/structure/DeleteUnitDialog.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteUnitDialog } from "./DeleteUnitDialog";
import type { Unit } from "./unit";

const UNIT: Unit = { id: "u1", blockId: "b1", number: "203", floor: 2 };

describe("DeleteUnitDialog", () => {
  it("não renderiza quando unit é null", () => {
    render(<DeleteUnitDialog unit={null} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("mostra o número no título e avisa sobre moradores vinculados", () => {
    render(<DeleteUnitDialog unit={UNIT} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText(/Excluir unidade 203\?/i)).toBeInTheDocument();
    expect(screen.getByText(/moradores vinculados/i)).toBeInTheDocument();
  });

  it("confirma e cancela", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<DeleteUnitDialog unit={UNIT} onCancel={onCancel} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: /^excluir$/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/structure/DeleteUnitDialog.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/structure/DeleteUnitDialog.tsx
import { Button } from "@/ui/Button/Button";
import { Modal } from "@/ui/Modal/Modal";
import type { Unit } from "./unit";
import styles from "./DeleteBlockDialog.module.css";

interface DeleteUnitDialogProps {
  unit: Unit | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteUnitDialog({
  unit,
  busy = false,
  onCancel,
  onConfirm,
}: DeleteUnitDialogProps) {
  if (!unit) return null;
  return (
    <Modal open onClose={onCancel} title={`Excluir unidade ${unit.number}?`}>
      <p className={styles.copy}>
        Moradores vinculados a esta unidade ficarão sem unidade cadastrada. Essa ação não pode ser
        desfeita.
      </p>
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          {busy ? "Excluindo…" : "Excluir"}
        </Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/structure/DeleteUnitDialog.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/structure/DeleteUnitDialog.tsx src/features/structure/DeleteUnitDialog.test.tsx
git commit -m "feat(plan-8-1): DeleteUnitDialog com copy de SET NULL"
```

---

## Task 11: `UnitsPage` (filtro por bloco + lista)

Filtro `<select>` por bloco (usa o query param server-side do `GET /units`), lista ordenada por bloco → andar → número (sort client-side), três empty states distintos: (a) **sem blocos** → orienta cadastrar bloco primeiro (botão "Nova unidade" escondido); (b) **filtro ativo sem unidades** → "Nenhuma unidade neste bloco"; (c) **sem unidades no condo** → "Nenhuma unidade cadastrada". Navegação para a página de blocos via `useNavigate` (rota tipada).

**Files:**

- Create: `src/features/structure/UnitsPage.tsx`
- Create: `src/features/structure/UnitsPage.module.css`
- Test: `src/features/structure/UnitsPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/structure/UnitsPage.test.tsx
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
    const labels = screen.getAllByText(/^(Apto|Sala) /).map((el) => el.textContent);
    expect(labels).toEqual(["Apto 101", "Apto 203", "Apto 11"]);
    expect(screen.getAllByText(/Torre A/).length).toBeGreaterThan(0);
  });

  it("filtro por bloco chama useUnits com o blockId", async () => {
    mockUseBlocks.mockReturnValue({ blocks: BLOCKS, isPending: false, isError: false });
    mockUseUnits.mockReturnValue({ units: UNITS, isPending: false, isError: false });
    render(<UnitsPage condoId="c1" />);
    await userEvent.selectOptions(screen.getByLabelText(/filtrar por bloco/i), "b2");
    expect(mockUseUnits).toHaveBeenLastCalledWith("c1", "b2");
  });

  it("filtro sem resultado: empty state específico", () => {
    mockUseBlocks.mockReturnValue({ blocks: BLOCKS, isPending: false, isError: false });
    mockUseUnits.mockReturnValue({ units: [], isPending: false, isError: false });
    render(<UnitsPage condoId="c1" />);
    // sem filtro → empty genérico
    expect(screen.getByText(/nenhuma unidade cadastrada/i)).toBeInTheDocument();
  });
});
```

> Para o teste de "filtro sem resultado", o cenário completo exigiria trocar o retorno do mock após `selectOptions` — simplificado aqui para o empty genérico; cobrir o empty de filtro com um segundo render usando `mockUseUnits` retornando `[]` e o select trocado (o mock registra a última chamada com `"b2"` no teste anterior). Se ficar frágil, extrair o texto do empty de filtro para assert via rerender com props de estado inicial — decidir na implementação.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/structure/UnitsPage.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/structure/UnitsPage.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/ui/Button/Button";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import { Spinner } from "@/ui/Spinner/Spinner";
import { formatFloor, type Unit } from "./unit";
import { useBlocks } from "./useBlocks";
import { useUnits } from "./useUnits";
import { useDeleteUnit } from "./useDeleteUnit";
import { UnitFormModal } from "./UnitFormModal";
import { DeleteUnitDialog } from "./DeleteUnitDialog";
import styles from "./UnitsPage.module.css";

interface UnitsPageProps {
  condoId: string;
}

type FormState = { mode: "create" } | { mode: "edit"; unit: Unit } | null;

export function UnitsPage({ condoId }: UnitsPageProps) {
  const navigate = useNavigate();
  const [blockFilter, setBlockFilter] = useState<string>("all");
  const { blocks, isPending: blocksPending, isError: blocksError } = useBlocks(condoId);
  const {
    units,
    isPending: unitsPending,
    isError: unitsError,
    refetch,
  } = useUnits(condoId, blockFilter === "all" ? undefined : blockFilter);
  const { deleteUnit, isPending: deleting } = useDeleteUnit(condoId);

  const [formState, setFormState] = useState<FormState>(null);
  const [toDelete, setToDelete] = useState<Unit | null>(null);

  const blockNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of blocks ?? []) map.set(b.id, b.name);
    return map;
  }, [blocks]);

  const sorted = useMemo(() => {
    return [...(units ?? [])].sort((a, b) => {
      const blockCmp = (blockNameById.get(a.blockId) ?? "").localeCompare(
        blockNameById.get(b.blockId) ?? "",
        "pt-BR",
      );
      if (blockCmp !== 0) return blockCmp;
      const floorCmp = (a.floor ?? 0) - (b.floor ?? 0);
      if (floorCmp !== 0) return floorCmp;
      return a.number.localeCompare(b.number, "pt-BR", { numeric: true });
    });
  }, [units, blockNameById]);

  function handleConfirmDelete() {
    if (!toDelete) return;
    deleteUnit({ id: toDelete.id }, { onSuccess: () => setToDelete(null) });
  }

  function goToBlocks() {
    void navigate({
      to: "/c/$condoId/structure/blocks",
      params: { condoId },
    });
  }

  const isPending = blocksPending || unitsPending;
  const isError = blocksError || unitsError;
  const hasBlocks = (blocks ?? []).length > 0;

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Unidades</h1>
          <p className={styles.sub}>
            {units !== undefined
              ? `${units.length} unidade${units.length === 1 ? "" : "s"}`
              : "Apartamentos, salas e demais unidades do condomínio"}
          </p>
        </div>
        <div className={styles.actions}>
          {hasBlocks && (
            <Button onClick={() => setFormState({ mode: "create" })}>
              <Plus size={14} /> Nova unidade
            </Button>
          )}
        </div>
      </header>

      {isPending ? (
        <Spinner />
      ) : isError ? (
        <EmptyState
          title="Não foi possível carregar as unidades"
          description="Verifique sua conexão e tente novamente."
          role="alert"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                void refetch();
              }}
            >
              Tentar novamente
            </Button>
          }
        />
      ) : !hasBlocks ? (
        <EmptyState
          title="Cadastre um bloco antes de adicionar unidades"
          description="Unidades pertencem a blocos — comece cadastrando a estrutura de blocos do condomínio."
          action={
            <Button variant="secondary" onClick={goToBlocks}>
              Ir para blocos
            </Button>
          }
        />
      ) : (
        <>
          <div className={styles.filterRow}>
            <label htmlFor="units-block-filter" className={styles.filterLabel}>
              Filtrar por bloco
            </label>
            <select
              id="units-block-filter"
              className={styles.filterSelect}
              value={blockFilter}
              onChange={(e) => setBlockFilter(e.target.value)}
            >
              <option value="all">Todos os blocos</option>
              {(blocks ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {sorted.length === 0 ? (
            <EmptyState
              title={
                blockFilter === "all" ? "Nenhuma unidade cadastrada" : "Nenhuma unidade neste bloco"
              }
              description="Cadastre a primeira unidade para vincular moradores a ela."
              action={
                <Button onClick={() => setFormState({ mode: "create" })}>
                  <Plus size={14} /> Nova unidade
                </Button>
              }
            />
          ) : (
            <ul className={styles.list}>
              {sorted.map((u) => (
                <li key={u.id} className={styles.row}>
                  <div className={styles.rowInfo}>
                    <span className={styles.rowTitle}>Apto {u.number}</span>
                    <span className={styles.rowMeta}>
                      {blockNameById.get(u.blockId) ?? "—"} · {formatFloor(u.floor)}
                    </span>
                  </div>
                  <div className={styles.rowActions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Editar unidade ${u.number}`}
                      onClick={() => setFormState({ mode: "edit", unit: u })}
                    >
                      <Pencil size={14} /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Excluir unidade ${u.number}`}
                      onClick={() => setToDelete(u)}
                    >
                      <Trash2 size={14} /> Excluir
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {formState !== null && (
        <UnitFormModal
          condoId={condoId}
          unit={formState.mode === "edit" ? formState.unit : null}
          blocks={blocks ?? []}
          onClose={() => setFormState(null)}
        />
      )}

      <DeleteUnitDialog
        unit={toDelete}
        busy={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
```

> O teste de ordenação assume o prefixo "Apto" na listagem. Isso é uma **simplificação de apresentação** — `number` é texto livre ("Sala 4" ficaria "Apto Sala 4"). Alternativa honesta: exibir só `{u.number}` sem prefixo. **Decidir na implementação** e alinhar o teste (regex `/^(Apto|Sala) /` já antecipa a troca para número puro: se remover o prefixo, o assert vira `["101", "203", "11"]`).

```css
/* src/features/structure/UnitsPage.module.css */
.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-5);
  margin-bottom: var(--space-5);
}

.title {
  margin: 0;
  font-size: var(--fs-2xl);
  font-weight: var(--fw-semibold);
  color: var(--fg-primary);
}

.sub {
  margin: 0;
  color: var(--fg-secondary);
  font-size: var(--fs-sm);
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.filterRow {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.filterLabel {
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  color: var(--fg-secondary);
}

.filterSelect {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  color: var(--fg-primary);
  font-size: var(--fs-sm);
}

.filterSelect:focus {
  outline: none;
  border-color: var(--brand);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
}

.rowInfo {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.rowTitle {
  font-weight: var(--fw-semibold);
  color: var(--fg-primary);
}

.rowMeta {
  font-size: var(--fs-sm);
  color: var(--fg-tertiary);
}

.rowActions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}
```

> O CSS de página é idêntico ao de `BlocksPage` (mais `.filterRow/.filterLabel/.filterSelect`). Se preferir, extrair `structureList.module.css` compartilhado — decidir na implementação; testes não dependem de classes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/structure/UnitsPage.test.tsx`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/structure/UnitsPage.tsx src/features/structure/UnitsPage.module.css src/features/structure/UnitsPage.test.tsx
git commit -m "feat(plan-8-1): UnitsPage com filtro por bloco e empty states"
```

---

## Task 12: Plugar a rota de unidades + verificação final + PR

**Files:**

- Modify: `src/app/routes/_app/c/$condoId/structure/units.tsx`

- [ ] **Step 1: Atualizar a rota**

```tsx
// src/app/routes/_app/c/$condoId/structure/units.tsx
import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/routeGuards";
import { UnitsPage } from "@/features/structure/UnitsPage";

export const Route = createFileRoute("/_app/c/$condoId/structure/units")({
  beforeLoad: requireRole("manager"),
  component: function UnitsRoute() {
    const { condoId } = Route.useParams();
    return <UnitsPage condoId={condoId} />;
  },
});
```

- [ ] **Step 2: Verificação completa**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: tudo verde. Stylelint deve passar sem nenhum valor cru (só tokens); se acusar token inexistente, conferir `src/design-tokens/` e ajustar.

- [ ] **Step 3: Audit de regressão do shell (checklist do CLAUDE.md)**

- [ ] Sidebar "Estrutura" continua com os 3 itens e só aparece para manager em scope condo (nada mudou — confirmar visualmente no dev server).
- [ ] `beforeLoad: requireRole("manager")` intacto nas duas rotas (diff mostra só a troca do componente).
- [ ] Nenhum import de `EmptyState` removido de rotas que ainda são placeholder (`common-areas` segue placeholder até o Plan 8.2).
- [ ] `git diff --stat` mostra apenas: `src/features/structure/*` (novos) + 2 rotas modificadas. Nada mais.

- [ ] **Step 4: Commit + PR contra `develop`**

```bash
git add 'src/app/routes/_app/c/$condoId/structure/units.tsx'
git commit -m "feat(plan-8-1): rota structure/units renderiza UnitsPage"
git push -u origin feature/plan-8-1-structure-blocks-units
gh pr create --base develop --title "feat(structure): CRUD de blocos e unidades (Plan 8.1)" --body "Substitui os placeholders de structure/blocks e structure/units por CRUDs completos contra o Core. Plan: docs/superpowers/plans/2026-07-21-plan-8-1-blocks-units-crud.md"
```

**PR checklist (colar na descrição):**

- [ ] CRUD blocos: listar/criar/editar/excluir com copy de CASCADE
- [ ] CRUD unidades: listar (filtro por bloco)/criar/editar/excluir com copy de SET NULL
- [ ] Toasts de sucesso/erro com retry; erro 400 vai para banner inline do modal
- [ ] Delete de bloco invalida blocks + units (cascade do Core)
- [ ] Empty states: sem blocos / sem unidades / filtro vazio / erro com retry
- [ ] Guards `requireRole("manager")` intactos; sidebar inalterada
- [ ] `typecheck && lint && test && build` verdes

---

## Fora de escopo (follow-ups)

- **Seletor real de unidade/área comum no `TicketCreateModal`** — desbloqueado por este plan (dados existem), mas é mudança no fluxo de tickets: plan próprio.
- **Áreas comuns** — Plan 8.2 (outline abaixo).
- **Limpar `floor` de uma unidade** — impossível hoje (API sem nullable); se virar necessidade real, pedir mudança no Core.
- **Paginação/infinite scroll das listas** — Core não pagina; se condos grandes (>500 unidades) ficarem lentos, revisit com o Core.

## Plan 8.2 — Áreas comuns (outline para o próximo doc)

Espelho do 8.1 com uma entidade: `commonArea.ts` (`CommonArea` + `toCommonArea` + `COMMON_AREA_TYPES = ["elevator","pool","lobby","garage","gym","other"]` com labels pt-BR: Elevador, Piscina, Hall, Garagem, Academia, Outro — union type enforced no frontend, já que o enum é só texto no swagger) · `useCommonAreas` · 3 mutations (`type` incluído em create/update) · `CommonAreaFormModal` (nome + select de tipo) · `DeleteCommonAreaDialog` (copy: _"tickets vinculados ficarão sem área comum"_) · `CommonAreasPage` · rota `structure/common-areas`. ~7 tasks. Reusar `structureError.ts`, CSS de form/lista e todos os padrões deste plan.
