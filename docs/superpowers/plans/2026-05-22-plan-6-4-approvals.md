# Plan 6.4 — Approvals page (lista PENDING) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir os placeholders das rotas `/approvals` (cross-condo) e `/c/$condoId/approvals` (per-condo) por uma página real que lista moradores com status `PENDING`, com ações Aprovar/Rejeitar contra o Core.

**Architecture:** TanStack Query + `openapi-fetch` direto (sem repository — o endpoint já existe, YAGNI). Um hook de leitura (`usePendingResidents`) que despacha pela `Scope`: em `condo`, query única; em `all`, fan-out por condo via `useQueries` (mesmo padrão do `useTicketsScoped`), passando `X-Condo-ID` explícito por request e anotando o `condoName` da membership. Duas mutations (`useApproveResident`, `useRejectResident`) que recebem `{ id, condoId }` e invalidam a query do condo afetado. UI presentacional em `src/features/approvals/` + um primitivo `Avatar` novo em `src/ui/`.

**Tech Stack:** React 19 · TanStack Query/Router · TypeScript strict · `openapi-fetch` · Radix Dialog (via `Modal`) · CSS Modules + design tokens · Vitest + Testing Library.

---

## Contexto do Core (ground truth — não inventar campos)

`GET /residents` (router: viewer+; rota gated em manager) devolve `ResidentResponse[]` do **condo ativo** (header `X-Condo-ID`), **sem filtro server-side** — filtrar `status === "PENDING"` no cliente. Shape real (`src/api/types.ts:2394`, tudo opcional na geração):

```
condo_id?, created_at?, email?, id?, name?, phone?, status?, unit_id?, updated_at?
```

- `PATCH /residents/{id}/approve` → status `ACTIVE`; devolve `ResidentResponse`; **body vazio**.
- `PATCH /residents/{id}/reject` → status `INACTIVE`; devolve `ResidentResponse`; **body vazio**. **PATCH, não DELETE.**

### Desvios conscientes do handoff (`docs/handoff/zivy-wa-green/project/src/page-approvals.jsx`)

O mock do handoff inventou campos que o Core **não** retorna. Honrar a premissa de tipagem honesta (CLAUDE.md) — **nada de `as`, nada de campos fabricados**:

| Campo do mock                          | Decisão neste plano                                                                                                                                                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `block` / `unit` ("Bloco B · Apt 203") | **Omitido.** Core só dá `unit_id` (UUID) e ele costuma vir vazio em PENDING (a unidade é resolvida ao fim do onboarding — ver descrição do POST). Resolver UUID→nome exigiria `GET /units` e fica fora do escopo. |
| `condoName`                            | **Anotado pelo hook** a partir da membership (`useMyCondos`), não do payload.                                                                                                                                     |
| `botSession` ("Cadastrado via bot")    | **Omitido.** Core não modela esse flag. Não exibir o badge.                                                                                                                                                       |
| `phone` mascarado                      | Core devolve `phone` cru; **mascarar no cliente** (`maskPhone`).                                                                                                                                                  |
| `pendingSince`                         | Mapeado de `created_at` → "Pendente há X" (`formatRelTime`).                                                                                                                                                      |

A página entrega: avatar (iniciais), nome, telefone mascarado, condomínio, "Pendente há X", ações Rejeitar/Aprovar. Sem block/unit/bot.

### Atenção cross-condo

`GET /residents` exige `X-Condo-ID`. Em `all`, fan-out só sobre condos onde o usuário é **manager+** (a rota é manager-gated; consultar condo onde é `viewer` retornaria 403). Mesmo critério para o destino das mutations.

---

## File structure

```
src/
├── ui/
│   └── Avatar/                          # NOVO — primitivo reutilizável (6.5 também usa)
│       ├── Avatar.tsx
│       ├── Avatar.module.css
│       └── Avatar.stories.tsx
├── lib/
│   ├── maskPhone.ts                     # NOVO — pura, mascara telefone p/ exibição
│   └── maskPhone.test.ts                # NOVO
└── features/
    └── approvals/                       # NOVO (toda a slice)
        ├── pendingResident.ts           # domain type + toPendingResident (mapper/guard)
        ├── pendingResident.test.ts
        ├── usePendingResidents.ts       # leitura scope-aware (condo | fan-out all)
        ├── usePendingResidents.test.tsx
        ├── useApproveResident.ts        # PATCH /residents/{id}/approve
        ├── useApproveResident.test.tsx
        ├── useRejectResident.ts         # PATCH /residents/{id}/reject
        ├── useRejectResident.test.tsx
        ├── ApprovalCard.tsx             # presentacional
        ├── ApprovalCard.module.css
        ├── ApprovalCard.stories.tsx
        ├── ApprovalCard.test.tsx
        ├── RejectConfirmDialog.tsx      # confirm sobre o Modal (padrão Plan 4)
        ├── RejectConfirmDialog.test.tsx
        ├── ApprovalsPage.tsx            # composição (usa useScope)
        ├── ApprovalsPage.module.css
        └── ApprovalsPage.test.tsx

src/app/routes/_app/approvals.tsx                 # MODIFICAR — placeholder → <ApprovalsPage/>
src/app/routes/_app/c/$condoId/approvals.tsx      # MODIFICAR — placeholder → <ApprovalsPage/>
```

**Convenções obrigatórias (CLAUDE.md):** identificadores em inglês, UI em pt-BR · sem `any`/cast de domínio — usar `toPendingResident` (retorna `T | null`) e `filter` · `exactOptionalPropertyTypes`: omitir chave de prop opcional, não `prop: undefined` · hooks que importam `@/api/client` testados com `vi.mock` + `vi.hoisted` (nunca `vi.spyOn`) · botões `type="button"` · handlers com Promise envolvidos em `() => { void fn(); }` · classes de CSS Module via `Record<…>` com `?? ""`.

---

## Task 1: Domain type `PendingResident` + mapper `toPendingResident`

Espelha o padrão `toCondoMembership` (`src/features/condo/condoMembership.ts`): mapper que devolve `T | null`, validando o payload cru e filtrando quem não é PENDING. Sem type guard `is X` solto — o mapper já é o ponto de verdade.

**Files:**

- Create: `src/features/approvals/pendingResident.ts`
- Test: `src/features/approvals/pendingResident.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/features/approvals/pendingResident.test.ts
import { describe, expect, it } from "vitest";
import { toPendingResident } from "./pendingResident";

const RAW = {
  id: "r1",
  name: "Lucas Ferreira",
  phone: "+5511999994312",
  status: "PENDING",
  condo_id: "c1",
  created_at: "2026-05-12T07:40:00Z",
};

describe("toPendingResident", () => {
  it("mapeia um resident PENDING completo, anotando condoName", () => {
    expect(toPendingResident(RAW, "Residencial Jardins")).toEqual({
      id: "r1",
      name: "Lucas Ferreira",
      phone: "+5511999994312",
      condoId: "c1",
      condoName: "Residencial Jardins",
      createdAt: "2026-05-12T07:40:00Z",
    });
  });

  it("retorna null quando o status não é PENDING", () => {
    expect(toPendingResident({ ...RAW, status: "ACTIVE" }, "X")).toBeNull();
  });

  it("retorna null quando falta id ou name", () => {
    expect(toPendingResident({ ...RAW, id: undefined }, "X")).toBeNull();
    expect(toPendingResident({ ...RAW, name: "" }, "X")).toBeNull();
  });

  it("usa condo_id do payload quando presente, senão o fallback", () => {
    expect(toPendingResident({ ...RAW, condo_id: undefined }, "X")?.condoId).toBe("fallback-c");
  });

  it("omite phone/createdAt ausentes (não vira undefined explícito)", () => {
    const r = toPendingResident({ id: "r2", name: "Ana", status: "PENDING", condo_id: "c1" }, "X");
    expect(r).not.toBeNull();
    expect("phone" in r!).toBe(false);
    expect("createdAt" in r!).toBe(false);
  });
});
```

> Nota: o último teste de `condo_id: undefined` precisa de um segundo argumento de fallback. Ajustar a assinatura para `toPendingResident(raw, condoName, fallbackCondoId?)` — o teste acima de fallback assume `toPendingResident({...}, "X", "fallback-c")`. Corrigir a chamada do teste para passar `"fallback-c"` como 3º arg.

Corrigir o teste de fallback:

```ts
it("usa condo_id do payload quando presente, senão o fallback", () => {
  expect(toPendingResident({ ...RAW, condo_id: undefined }, "X", "fallback-c")?.condoId).toBe(
    "fallback-c",
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/approvals/pendingResident.test.ts`
Expected: FAIL — `Failed to resolve import "./pendingResident"` / `toPendingResident is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/approvals/pendingResident.ts

/** Resident PENDING pronto para a UI — campos derivados do Core + condoName anotado. */
export interface PendingResident {
  id: string;
  name: string;
  condoId: string;
  condoName: string;
  phone?: string;
  createdAt?: string;
}

type RawResident = {
  id?: string;
  name?: string;
  phone?: string;
  status?: string;
  condo_id?: string;
  created_at?: string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/**
 * Mapeia `ResidentResponse` cru → `PendingResident`, ou `null` se não for um
 * resident PENDING válido. `condoName` vem da membership; `fallbackCondoId`
 * cobre o caso (raro) de o payload não trazer `condo_id`.
 */
export function toPendingResident(
  raw: RawResident,
  condoName: string,
  fallbackCondoId = "",
): PendingResident | null {
  if (raw.status !== "PENDING") return null;
  if (!isNonEmptyString(raw.id) || !isNonEmptyString(raw.name)) return null;

  const condoId = isNonEmptyString(raw.condo_id) ? raw.condo_id : fallbackCondoId;
  if (!isNonEmptyString(condoId)) return null;

  return {
    id: raw.id,
    name: raw.name,
    condoId,
    condoName,
    ...(isNonEmptyString(raw.phone) ? { phone: raw.phone } : {}),
    ...(isNonEmptyString(raw.created_at) ? { createdAt: raw.created_at } : {}),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/approvals/pendingResident.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/approvals/pendingResident.ts src/features/approvals/pendingResident.test.ts
git commit -m "feat(plan-6-4): PendingResident type + toPendingResident mapper"
```

---

## Task 2: Helper `maskPhone`

Pura, sem deps. Mascara o miolo do telefone para exibição, preservando prefixo e os 4 últimos dígitos.

**Files:**

- Create: `src/lib/maskPhone.ts`
- Test: `src/lib/maskPhone.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/maskPhone.test.ts
import { describe, expect, it } from "vitest";
import { maskPhone } from "./maskPhone";

describe("maskPhone", () => {
  it("mascara o miolo preservando prefixo e 4 últimos dígitos", () => {
    expect(maskPhone("+5511999994312")).toBe("+55 11 9****-4312");
  });

  it("lida com número sem código de país (10-11 dígitos)", () => {
    expect(maskPhone("11999994312")).toBe("11 9****-4312");
  });

  it("retorna '—' para vazio/undefined", () => {
    expect(maskPhone(undefined)).toBe("—");
    expect(maskPhone("")).toBe("—");
  });

  it("retorna o original quando há poucos dígitos para mascarar", () => {
    expect(maskPhone("12345")).toBe("12345");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/maskPhone.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/maskPhone.ts

/**
 * Mascara um telefone para exibição: preserva o DDI (quando presente), o DDD,
 * o primeiro dígito do número e os 4 últimos; oculta o miolo com `*`.
 * Trabalha sobre os dígitos; números curtos demais voltam crus.
 *
 * "+5511999994312" → "+55 11 9****-4312"
 * "11999994312"    → "11 9****-4312"
 */
export function maskPhone(phone: string | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return phone;

  const hasCountry = digits.length > 11;
  const country = hasCountry ? digits.slice(0, digits.length - 11) : "";
  const local = hasCountry ? digits.slice(digits.length - 11) : digits;

  const ddd = local.slice(0, 2);
  const rest = local.slice(2); // 8 ou 9 dígitos
  const first = rest.slice(0, 1);
  const last4 = rest.slice(-4);
  const masked = "*".repeat(Math.max(0, rest.length - 5));

  const prefix = country ? `+${country} ` : "";
  return `${prefix}${ddd} ${first}${masked}-${last4}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/maskPhone.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/maskPhone.ts src/lib/maskPhone.test.ts
git commit -m "feat(plan-6-4): maskPhone helper para exibição"
```

---

## Task 3: Hook `usePendingResidents(scope)`

Leitura scope-aware. `condo` → uma query; `all` → fan-out sobre condos manager+ (`useQueries`, igual `useTicketsScoped`). Cada request passa `X-Condo-ID` explícito; o resultado é mapeado por `toPendingResident` (anotando `condoName`) e achatado.

**Files:**

- Create: `src/features/approvals/usePendingResidents.ts`
- Test: `src/features/approvals/usePendingResidents.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/approvals/usePendingResidents.test.tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { CondoMembership } from "@/features/condo/useMyCondos";

const { mockGet, mockUseMyCondos } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockUseMyCondos: vi.fn(),
}));
vi.mock("@/api/client", () => ({ api: { GET: mockGet } }));
vi.mock("@/features/condo/useMyCondos", () => ({ useMyCondos: mockUseMyCondos }));

import { usePendingResidents } from "./usePendingResidents";

const CONDOS: CondoMembership[] = [
  { condoId: "c1", condoName: "Solar", condoSlug: "solar", role: "manager" },
  { condoId: "c2", condoName: "Vista", condoSlug: "vista", role: "viewer" },
];

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

function residentRow(condo: string, id: string, status = "PENDING") {
  return { id, name: `Resident ${id}`, phone: "+5511999990000", status, condo_id: condo };
}

afterEach(() => {
  mockGet.mockReset();
  mockUseMyCondos.mockReset();
  vi.restoreAllMocks();
});

describe("usePendingResidents", () => {
  it("scope=condo: consulta só aquele condo e filtra PENDING", async () => {
    mockUseMyCondos.mockReturnValue({ data: CONDOS });
    mockGet.mockResolvedValue({
      data: [residentRow("c1", "r1"), residentRow("c1", "r2", "ACTIVE")],
      error: undefined,
    });

    const { result } = renderHook(() => usePendingResidents({ kind: "condo", condoId: "c1" }), {
      wrapper: wrapper(mkClient()),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith("/residents", { headers: { "X-Condo-ID": "c1" } });
    expect(result.current.residents).toHaveLength(1);
    expect(result.current.residents[0]).toMatchObject({ id: "r1", condoName: "Solar" });
  });

  it("scope=all: fan-out só sobre condos manager+ e concatena", async () => {
    mockUseMyCondos.mockReturnValue({ data: CONDOS });
    mockGet.mockImplementation((_p: string, opts: { headers: Record<string, string> }) =>
      Promise.resolve({ data: [residentRow(opts.headers["X-Condo-ID"]!, "r1")], error: undefined }),
    );

    const { result } = renderHook(() => usePendingResidents({ kind: "all" }), {
      wrapper: wrapper(mkClient()),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    // c2 é viewer → não consultado
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith("/residents", { headers: { "X-Condo-ID": "c1" } });
    expect(result.current.residents).toHaveLength(1);
    expect(result.current.residents[0]).toMatchObject({ condoId: "c1", condoName: "Solar" });
  });

  it("propaga isError quando uma query falha", async () => {
    mockUseMyCondos.mockReturnValue({ data: CONDOS });
    mockGet.mockResolvedValue({ data: undefined, error: { message: "boom" } });

    const { result } = renderHook(() => usePendingResidents({ kind: "condo", condoId: "c1" }), {
      wrapper: wrapper(mkClient()),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/approvals/usePendingResidents.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/approvals/usePendingResidents.ts
import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useMyCondos, type CondoMembership } from "@/features/condo/useMyCondos";
import { isAtLeast } from "@/features/condo/roleHierarchy";
import type { Scope } from "@/features/scope/useScope";
import { toPendingResident, type PendingResident } from "./pendingResident";

async function fetchPending(condo: CondoMembership): Promise<PendingResident[]> {
  const { data, error } = await api.GET("/residents", {
    headers: { "X-Condo-ID": condo.condoId },
  });
  if (error) {
    throw new Error("ApprovalsService.fetchPending: falha em GET /residents", { cause: error });
  }
  return (data ?? [])
    .map((r) => toPendingResident(r, condo.condoName, condo.condoId))
    .filter((r): r is PendingResident => r !== null);
}

export interface PendingResidentsResult {
  residents: PendingResident[];
  isPending: boolean;
  isError: boolean;
}

export function usePendingResidents(scope: Scope): PendingResidentsResult {
  const { data: condos } = useMyCondos();
  const all = condos ?? [];

  const targets =
    scope.kind === "condo"
      ? all.filter((c) => c.condoId === scope.condoId)
      : all.filter((c) => isAtLeast(c.role, "manager"));

  const results = useQueries({
    queries: targets.map((condo) => ({
      queryKey: ["residents", condo.condoId] as const,
      queryFn: () => fetchPending(condo),
      staleTime: 10_000,
    })),
  });

  const residents = results.flatMap((r) => r.data ?? []);

  return {
    residents,
    isPending: condos === undefined || results.some((r) => r.isPending),
    isError: results.some((r) => r.isError),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/approvals/usePendingResidents.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/approvals/usePendingResidents.ts src/features/approvals/usePendingResidents.test.tsx
git commit -m "feat(plan-6-4): usePendingResidents scope-aware (condo | fan-out all)"
```

---

## Task 4: Mutations `useApproveResident` e `useRejectResident`

Mesma forma; só muda o path. Recebem `{ id, condoId }`, mandam PATCH com `X-Condo-ID` do condo do resident (importa em cross-condo) e invalidam `["residents", condoId]`.

**Files:**

- Create: `src/features/approvals/useApproveResident.ts`
- Create: `src/features/approvals/useRejectResident.ts`
- Test: `src/features/approvals/useApproveResident.test.tsx`
- Test: `src/features/approvals/useRejectResident.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/features/approvals/useApproveResident.test.tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPatch } = vi.hoisted(() => ({ mockPatch: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { PATCH: mockPatch } }));

import { useApproveResident } from "./useApproveResident";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

afterEach(() => {
  mockPatch.mockReset();
  vi.restoreAllMocks();
});

describe("useApproveResident", () => {
  it("chama PATCH /residents/{id}/approve com X-Condo-ID e invalida a query do condo", async () => {
    mockPatch.mockResolvedValue({ data: { id: "r1", status: "ACTIVE" }, error: undefined });
    const qc = mkClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useApproveResident(), { wrapper: wrapper(qc) });
    act(() => result.current.approve({ id: "r1", condoId: "c1" }));

    await waitFor(() => expect(mockPatch).toHaveBeenCalled());
    expect(mockPatch).toHaveBeenCalledWith("/residents/{id}/approve", {
      params: { path: { id: "r1" } },
      headers: { "X-Condo-ID": "c1" },
    });
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["residents", "c1"] }));
  });

  it("expõe isError quando o Core falha", async () => {
    mockPatch.mockResolvedValue({ data: undefined, error: { message: "403" } });
    const { result } = renderHook(() => useApproveResident(), { wrapper: wrapper(mkClient()) });
    act(() => result.current.approve({ id: "r1", condoId: "c1" }));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

```tsx
// src/features/approvals/useRejectResident.test.tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPatch } = vi.hoisted(() => ({ mockPatch: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { PATCH: mockPatch } }));

import { useRejectResident } from "./useRejectResident";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

afterEach(() => {
  mockPatch.mockReset();
  vi.restoreAllMocks();
});

describe("useRejectResident", () => {
  it("chama PATCH /residents/{id}/reject com X-Condo-ID e invalida a query do condo", async () => {
    mockPatch.mockResolvedValue({ data: { id: "r1", status: "INACTIVE" }, error: undefined });
    const qc = mkClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    const { result } = renderHook(() => useRejectResident(), { wrapper: wrapper(qc) });
    act(() => result.current.reject({ id: "r1", condoId: "c1" }));

    await waitFor(() => expect(mockPatch).toHaveBeenCalled());
    expect(mockPatch).toHaveBeenCalledWith("/residents/{id}/reject", {
      params: { path: { id: "r1" } },
      headers: { "X-Condo-ID": "c1" },
    });
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ["residents", "c1"] }));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/approvals/useApproveResident.test.tsx src/features/approvals/useRejectResident.test.tsx`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Write minimal implementations**

```ts
// src/features/approvals/useApproveResident.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export interface ResidentActionInput {
  id: string;
  condoId: string;
}

export function useApproveResident() {
  const qc = useQueryClient();
  const m = useMutation<void, Error, ResidentActionInput>({
    mutationFn: async ({ id, condoId }) => {
      const { error } = await api.PATCH("/residents/{id}/approve", {
        params: { path: { id } },
        headers: { "X-Condo-ID": condoId },
      });
      if (error) {
        throw new Error("ApprovalsService.approve: falha em PATCH /residents/{id}/approve", {
          cause: error,
        });
      }
    },
    onSuccess: (_data, { condoId }) => qc.invalidateQueries({ queryKey: ["residents", condoId] }),
  });

  return {
    approve: (input: ResidentActionInput, opts?: { onSuccess?: () => void }) =>
      m.mutate(input, opts),
    isPending: m.isPending,
    isError: m.isError,
  };
}
```

```ts
// src/features/approvals/useRejectResident.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ResidentActionInput } from "./useApproveResident";

export function useRejectResident() {
  const qc = useQueryClient();
  const m = useMutation<void, Error, ResidentActionInput>({
    mutationFn: async ({ id, condoId }) => {
      const { error } = await api.PATCH("/residents/{id}/reject", {
        params: { path: { id } },
        headers: { "X-Condo-ID": condoId },
      });
      if (error) {
        throw new Error("ApprovalsService.reject: falha em PATCH /residents/{id}/reject", {
          cause: error,
        });
      }
    },
    onSuccess: (_data, { condoId }) => qc.invalidateQueries({ queryKey: ["residents", condoId] }),
  });

  return {
    reject: (input: ResidentActionInput, opts?: { onSuccess?: () => void }) =>
      m.mutate(input, opts),
    isPending: m.isPending,
    isError: m.isError,
  };
}
```

> Nota: `ResidentActionInput` é definido em `useApproveResident.ts` e reusado por `useRejectResident.ts` (DRY). Se preferir, mover para `pendingResident.ts` — mantenha em um único lugar.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/approvals/useApproveResident.test.tsx src/features/approvals/useRejectResident.test.tsx`
Expected: PASS (3 testes no total).

- [ ] **Step 5: Commit**

```bash
git add src/features/approvals/useApproveResident.ts src/features/approvals/useRejectResident.ts src/features/approvals/useApproveResident.test.tsx src/features/approvals/useRejectResident.test.tsx
git commit -m "feat(plan-6-4): mutations approve/reject resident com invalidate por condo"
```

---

## Task 5: Primitivo `Avatar` (UI)

Avatar de iniciais, reutilizável (a Slice 6.5 usa na timeline). Sem imagem — só iniciais sobre fundo de marca.

**Files:**

- Create: `src/ui/Avatar/Avatar.tsx`
- Create: `src/ui/Avatar/Avatar.module.css`
- Create: `src/ui/Avatar/Avatar.stories.tsx`
- Test: `src/ui/Avatar/Avatar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/Avatar/Avatar.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("deriva até 2 iniciais do nome", () => {
    render(<Avatar name="Lucas Ferreira" />);
    expect(screen.getByText("LF")).toBeInTheDocument();
  });

  it("usa só uma inicial quando o nome tem uma palavra", () => {
    render(<Avatar name="Ana" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("expõe o nome completo como aria-label", () => {
    render(<Avatar name="Marcos Vinicius" />);
    expect(screen.getByLabelText("Marcos Vinicius")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/Avatar/Avatar.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/ui/Avatar/Avatar.tsx
import styles from "./Avatar.module.css";

type Size = "md" | "lg";

interface AvatarProps {
  name: string;
  size?: Size;
}

const sizeClass: Record<Size, string> = {
  md: styles.md ?? "",
  lg: styles.lg ?? "",
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({ name, size = "md" }: AvatarProps) {
  const cls = [styles.avatar, sizeClass[size]].filter(Boolean).join(" ");
  return (
    <span className={cls} role="img" aria-label={name}>
      {initials(name)}
    </span>
  );
}
```

```css
/* src/ui/Avatar/Avatar.module.css */
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: var(--radius-full);
  background: var(--brand-soft);
  color: var(--brand);
  font-weight: var(--fw-semibold);
  line-height: 1;
  user-select: none;
}

.md {
  width: 32px;
  height: 32px;
  font-size: var(--fs-xs);
}

.lg {
  width: 44px;
  height: 44px;
  font-size: var(--fs-sm);
}
```

> Se `--radius-full` não existir nos tokens, usar `border-radius: 999px` cru não passa no `stylelint-declaration-strict-value`. Conferir o token disponível em `src/design-tokens/` (provavelmente `--radius-full` ou `--radius-pill`) e usar o nome correto antes de rodar o lint.

```tsx
// src/ui/Avatar/Avatar.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Avatar } from "./Avatar";

const meta = {
  title: "UI/Avatar",
  component: Avatar,
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Medio: Story = { args: { name: "Lucas Ferreira", size: "md" } };
export const Grande: Story = { args: { name: "Ana Beatriz", size: "lg" } };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/Avatar/Avatar.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/ui/Avatar/
git commit -m "feat(plan-6-4): primitivo Avatar (iniciais) em src/ui"
```

---

## Task 6: `ApprovalCard` (presentacional)

Card de um morador PENDING. Sem estado próprio — recebe `resident` + callbacks. Botões desabilitam durante a ação.

**Files:**

- Create: `src/features/approvals/ApprovalCard.tsx`
- Create: `src/features/approvals/ApprovalCard.module.css`
- Create: `src/features/approvals/ApprovalCard.stories.tsx`
- Test: `src/features/approvals/ApprovalCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/approvals/ApprovalCard.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApprovalCard } from "./ApprovalCard";
import type { PendingResident } from "./pendingResident";

const RESIDENT: PendingResident = {
  id: "r1",
  name: "Lucas Ferreira",
  condoId: "c1",
  condoName: "Residencial Jardins",
  phone: "+5511999994312",
  createdAt: "2026-05-12T07:40:00Z",
};

describe("ApprovalCard", () => {
  it("mostra nome, condomínio e telefone mascarado", () => {
    render(<ApprovalCard resident={RESIDENT} onApprove={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText("Lucas Ferreira")).toBeInTheDocument();
    expect(screen.getByText("Residencial Jardins")).toBeInTheDocument();
    expect(screen.getByText("+55 11 9****-4312")).toBeInTheDocument();
  });

  it("dispara onApprove e onReject", async () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(<ApprovalCard resident={RESIDENT} onApprove={onApprove} onReject={onReject} />);
    await userEvent.click(screen.getByRole("button", { name: /aprovar/i }));
    await userEvent.click(screen.getByRole("button", { name: /rejeitar/i }));
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it("desabilita os botões quando busy", () => {
    render(<ApprovalCard resident={RESIDENT} onApprove={vi.fn()} onReject={vi.fn()} busy />);
    expect(screen.getByRole("button", { name: /aprovar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /rejeitar/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/approvals/ApprovalCard.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/approvals/ApprovalCard.tsx
import { Check, X } from "lucide-react";
import { Avatar } from "@/ui/Avatar/Avatar";
import { Button } from "@/ui/Button/Button";
import { formatRelTime } from "@/lib/formatRelTime";
import { maskPhone } from "@/lib/maskPhone";
import type { PendingResident } from "./pendingResident";
import styles from "./ApprovalCard.module.css";

interface ApprovalCardProps {
  resident: PendingResident;
  onApprove: () => void;
  onReject: () => void;
  busy?: boolean;
}

export function ApprovalCard({ resident, onApprove, onReject, busy = false }: ApprovalCardProps) {
  return (
    <div className={styles.card}>
      <Avatar name={resident.name} size="lg" />
      <div className={styles.info}>
        <div className={styles.name}>{resident.name}</div>
        <div className={styles.meta}>
          <span>{resident.condoName}</span>
          <span className={styles.phone}>{maskPhone(resident.phone)}</span>
          <span className={styles.pending}>Pendente {formatRelTime(resident.createdAt)}</span>
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={onReject} disabled={busy}>
          <X size={14} /> Rejeitar
        </Button>
        <Button variant="primary" size="sm" onClick={onApprove} disabled={busy}>
          <Check size={14} /> Aprovar
        </Button>
      </div>
    </div>
  );
}
```

```css
/* src/features/approvals/ApprovalCard.module.css */
.card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
}

.info {
  flex: 1 1 auto;
  min-width: 0;
}

.name {
  font-weight: var(--fw-semibold);
  color: var(--fg-primary);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-3);
  margin-top: 2px;
  font-size: var(--fs-xs);
  color: var(--fg-tertiary);
}

.phone {
  font-family: var(--font-mono);
}

.pending {
  font-family: var(--font-mono);
}

.actions {
  display: flex;
  gap: var(--space-2);
  flex: 0 0 auto;
}
```

> Conferir os nomes de token antes do lint: `--border-subtle`, `--bg-surface`, `--radius-md`, `--fg-primary`, `--fg-tertiary`, `--fw-semibold`, `--font-mono`, `--space-*`, `--fs-*`. Se algum não existir, usar o equivalente do projeto (ver `src/design-tokens/` e usos em `ApprovalsPage`/`StatusBadge`). O `stylelint-declaration-strict-value` barra valores crus.

```tsx
// src/features/approvals/ApprovalCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ApprovalCard } from "./ApprovalCard";

const meta = {
  title: "Approvals/ApprovalCard",
  component: ApprovalCard,
} satisfies Meta<typeof ApprovalCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
  args: {
    resident: {
      id: "r1",
      name: "Lucas Ferreira",
      condoId: "c1",
      condoName: "Residencial Jardins",
      phone: "+5511999994312",
      createdAt: "2026-05-12T07:40:00Z",
    },
    onApprove: () => undefined,
    onReject: () => undefined,
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/approvals/ApprovalCard.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/approvals/ApprovalCard.tsx src/features/approvals/ApprovalCard.module.css src/features/approvals/ApprovalCard.stories.tsx src/features/approvals/ApprovalCard.test.tsx
git commit -m "feat(plan-6-4): ApprovalCard presentacional + story"
```

---

## Task 7: `RejectConfirmDialog`

Confirmação sobre o `Modal` existente (padrão Plan 4). Renderiza apenas quando há um `resident` selecionado.

**Files:**

- Create: `src/features/approvals/RejectConfirmDialog.tsx`
- Test: `src/features/approvals/RejectConfirmDialog.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/approvals/RejectConfirmDialog.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RejectConfirmDialog } from "./RejectConfirmDialog";
import type { PendingResident } from "./pendingResident";

const RESIDENT: PendingResident = {
  id: "r1",
  name: "Lucas Ferreira",
  condoId: "c1",
  condoName: "Residencial Jardins",
};

describe("RejectConfirmDialog", () => {
  it("não renderiza nada quando resident é null", () => {
    const { container } = render(
      <RejectConfirmDialog resident={null} onCancel={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra o nome no título e confirma/cancela", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<RejectConfirmDialog resident={RESIDENT} onCancel={onCancel} onConfirm={onConfirm} />);

    expect(screen.getByText(/Rejeitar Lucas Ferreira/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^rejeitar$/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/approvals/RejectConfirmDialog.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/approvals/RejectConfirmDialog.tsx
import { Button } from "@/ui/Button/Button";
import { Modal } from "@/ui/Modal/Modal";
import type { PendingResident } from "./pendingResident";

interface RejectConfirmDialogProps {
  resident: PendingResident | null;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}

export function RejectConfirmDialog({
  resident,
  onCancel,
  onConfirm,
  busy = false,
}: RejectConfirmDialogProps) {
  if (!resident) return null;
  return (
    <Modal open onClose={onCancel} title={`Rejeitar ${resident.name}?`}>
      <p>
        O morador será removido do sistema (status <strong>INACTIVE</strong>). Ele não poderá abrir
        chamados e precisará refazer o onboarding caso queira se cadastrar novamente.
      </p>
      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          justifyContent: "flex-end",
          marginTop: "var(--space-4)",
        }}
      >
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          Rejeitar
        </Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/approvals/RejectConfirmDialog.test.tsx`
Expected: PASS (2 testes).

> Se o `Modal` (Radix Dialog) renderizar em portal e o `container` não ficar vazio por causa do portal montado, ajustar a 1ª asserção para `expect(screen.queryByRole("dialog")).toBeNull()` em vez de `toBeEmptyDOMElement()`. Decidir conforme o comportamento real do `Modal` no jsdom.

- [ ] **Step 5: Commit**

```bash
git add src/features/approvals/RejectConfirmDialog.tsx src/features/approvals/RejectConfirmDialog.test.tsx
git commit -m "feat(plan-6-4): RejectConfirmDialog (confirm sobre Modal)"
```

---

## Task 8: `ApprovalsPage` (composição)

Junta tudo. Lê `useScope()`, busca via `usePendingResidents(scope)`, gerencia estado local (`toReject`, `approvedCount`), e despacha as mutations. Header + estados (loading/erro/vazio×2/lista) + banner informativo.

**Files:**

- Create: `src/features/approvals/ApprovalsPage.tsx`
- Create: `src/features/approvals/ApprovalsPage.module.css`
- Test: `src/features/approvals/ApprovalsPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/features/approvals/ApprovalsPage.test.tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PendingResident } from "./pendingResident";

const { mockUsePending, mockApprove, mockReject, mockUseScope } = vi.hoisted(() => ({
  mockUsePending: vi.fn(),
  mockApprove: vi.fn(),
  mockReject: vi.fn(),
  mockUseScope: vi.fn(),
}));
vi.mock("./usePendingResidents", () => ({ usePendingResidents: mockUsePending }));
vi.mock("./useApproveResident", () => ({
  useApproveResident: () => ({ approve: mockApprove, isPending: false, isError: false }),
}));
vi.mock("./useRejectResident", () => ({
  useRejectResident: () => ({ reject: mockReject, isPending: false, isError: false }),
}));
vi.mock("@/features/scope/useScope", () => ({ useScope: mockUseScope }));

import { ApprovalsPage } from "./ApprovalsPage";

const R: PendingResident = {
  id: "r1",
  name: "Lucas Ferreira",
  condoId: "c1",
  condoName: "Residencial Jardins",
  phone: "+5511999994312",
  createdAt: "2026-05-12T07:40:00Z",
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("ApprovalsPage", () => {
  it("mostra spinner enquanto pending", () => {
    mockUseScope.mockReturnValue({ kind: "all" });
    mockUsePending.mockReturnValue({ residents: [], isPending: true, isError: false });
    render(<ApprovalsPage />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("estado vazio inicial (sem aprovados)", () => {
    mockUseScope.mockReturnValue({ kind: "all" });
    mockUsePending.mockReturnValue({ residents: [], isPending: false, isError: false });
    render(<ApprovalsPage />);
    expect(screen.getByText(/nenhuma aprovação pendente/i)).toBeInTheDocument();
  });

  it("lista residents e aprova (chama mutation com id+condoId)", async () => {
    mockUseScope.mockReturnValue({ kind: "all" });
    mockUsePending.mockReturnValue({ residents: [R], isPending: false, isError: false });
    mockApprove.mockImplementation((_input, opts?: { onSuccess?: () => void }) =>
      opts?.onSuccess?.(),
    );

    render(<ApprovalsPage />);
    await userEvent.click(screen.getByRole("button", { name: /aprovar/i }));

    expect(mockApprove).toHaveBeenCalledWith(
      { id: "r1", condoId: "c1" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    await waitFor(() => expect(screen.getByText(/1 aprovado nesta sessão/i)).toBeInTheDocument());
  });

  it("rejeitar abre confirm; confirmar chama a mutation", async () => {
    mockUseScope.mockReturnValue({ kind: "all" });
    mockUsePending.mockReturnValue({ residents: [R], isPending: false, isError: false });

    render(<ApprovalsPage />);
    await userEvent.click(screen.getByRole("button", { name: /rejeitar/i }));
    // dialog abriu — botão "Rejeitar" de confirmação
    const confirm = await screen.findByRole("button", { name: /^rejeitar$/i });
    await userEvent.click(confirm);

    expect(mockReject).toHaveBeenCalledWith(
      { id: "r1", condoId: "c1" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/approvals/ApprovalsPage.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/approvals/ApprovalsPage.tsx
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Spinner } from "@/ui/Spinner/Spinner";
import { useScope } from "@/features/scope/useScope";
import { usePendingResidents } from "./usePendingResidents";
import { useApproveResident } from "./useApproveResident";
import { useRejectResident } from "./useRejectResident";
import { ApprovalCard } from "./ApprovalCard";
import { RejectConfirmDialog } from "./RejectConfirmDialog";
import type { PendingResident } from "./pendingResident";
import styles from "./ApprovalsPage.module.css";

export function ApprovalsPage() {
  const scope = useScope();
  const { residents, isPending, isError } = usePendingResidents(scope);
  const { approve } = useApproveResident();
  const { reject } = useRejectResident();

  const [toReject, setToReject] = useState<PendingResident | null>(null);
  const [approvedCount, setApprovedCount] = useState(0);

  function handleApprove(r: PendingResident) {
    approve({ id: r.id, condoId: r.condoId }, { onSuccess: () => setApprovedCount((n) => n + 1) });
  }

  function handleConfirmReject() {
    if (!toReject) return;
    reject({ id: toReject.id, condoId: toReject.condoId }, { onSuccess: () => setToReject(null) });
  }

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Aprovações pendentes</h1>
          <p className={styles.sub}>
            Moradores que se cadastraram via bot Telegram com status <code>PENDING</code>,
            aguardando confirmação do gestor.
          </p>
        </div>
        {approvedCount > 0 && (
          <span className={styles.approvedBadge}>
            {approvedCount} aprovado{approvedCount > 1 ? "s" : ""} nesta sessão
          </span>
        )}
      </header>

      {isPending ? (
        <Spinner />
      ) : isError ? (
        <div className={styles.empty}>Não foi possível carregar as aprovações.</div>
      ) : residents.length === 0 ? (
        <div className={styles.empty}>
          {approvedCount > 0
            ? "Tudo aprovado! Não há mais moradores aguardando aprovação."
            : "Nenhuma aprovação pendente no momento."}
        </div>
      ) : (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Moradores PENDING</h3>
            <span className={styles.count}>
              {residents.length} aguardando · confirme a identidade antes de aprovar
            </span>
          </div>
          <div className={styles.banner}>
            <ShieldCheck size={14} />
            <span>
              Aprovar muda o status para <strong>ACTIVE</strong> e libera o morador para abrir
              chamados.
            </span>
          </div>
          <div className={styles.list}>
            {residents.map((r) => (
              <ApprovalCard
                key={r.id}
                resident={r}
                onApprove={() => handleApprove(r)}
                onReject={() => setToReject(r)}
              />
            ))}
          </div>
        </section>
      )}

      <RejectConfirmDialog
        resident={toReject}
        onCancel={() => setToReject(null)}
        onConfirm={handleConfirmReject}
      />
    </>
  );
}
```

```css
/* src/features/approvals/ApprovalsPage.module.css */
.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.title {
  font-size: var(--fs-xl);
  font-weight: var(--fw-bold);
  color: var(--fg-primary);
}

.sub {
  margin-top: var(--space-1);
  font-size: var(--fs-sm);
  color: var(--fg-tertiary);
  max-width: 60ch;
}

.sub code {
  background: var(--bg-muted);
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
}

.approvedBadge {
  flex: 0 0 auto;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  background: var(--success-bg);
  color: var(--success-fg);
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
}

.card {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
}

.cardHeader {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}

.count {
  font-size: var(--fs-xs);
  color: var(--fg-tertiary);
}

.banner {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  margin: var(--space-3) var(--space-4) 0;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--info-bg);
  color: var(--info-fg);
  font-size: var(--fs-xs);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
}

.empty {
  padding: var(--space-8);
  text-align: center;
  font-size: var(--fs-sm);
  color: var(--fg-tertiary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
}
```

> Os nomes de token (`--success-bg`, `--info-bg`, `--radius-lg`, `--fs-xl`, `--fw-bold`, `--fw-medium`, etc.) precisam existir nos design-tokens. Antes do lint, conferir em `src/design-tokens/` e nos CSS Modules das overviews (`overviewLayout.module.css`) os nomes reais — substituir os que divergirem. `stylelint-declaration-strict-value` barra valor cru.
>
> O `Spinner` precisa expor `role="status"` para o 1º teste — conferir `src/ui/Spinner/Spinner.tsx`. Se não expuser, ou ajustar o Spinner (preferível, melhora a11y) ou trocar a asserção do teste para `screen.getByTestId(...)`/texto correspondente.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/approvals/ApprovalsPage.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/approvals/ApprovalsPage.tsx src/features/approvals/ApprovalsPage.module.css src/features/approvals/ApprovalsPage.test.tsx
git commit -m "feat(plan-6-4): ApprovalsPage (composição scope-aware + estados)"
```

---

## Task 9: Plugar nas rotas + verificação final + PR

Trocar os dois placeholders pela `ApprovalsPage`, mantendo os `beforeLoad` guards (não mexer neles).

**Files:**

- Modify: `src/app/routes/_app/approvals.tsx`
- Modify: `src/app/routes/_app/c/$condoId/approvals.tsx`

- [ ] **Step 1: Atualizar a rota cross-condo**

```tsx
// src/app/routes/_app/approvals.tsx
import { createFileRoute } from "@tanstack/react-router";
import { requireRoleAny } from "@/lib/routeGuards";
import { ApprovalsPage } from "@/features/approvals/ApprovalsPage";

export const Route = createFileRoute("/_app/approvals")({
  beforeLoad: requireRoleAny("manager"),
  component: ApprovalsPage,
});
```

- [ ] **Step 2: Atualizar a rota per-condo**

```tsx
// src/app/routes/_app/c/$condoId/approvals.tsx
import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/routeGuards";
import { ApprovalsPage } from "@/features/approvals/ApprovalsPage";

export const Route = createFileRoute("/_app/c/$condoId/approvals")({
  beforeLoad: requireRole("manager"),
  component: ApprovalsPage,
});
```

> `ApprovalsPage` lê `useScope()` internamente: na rota cross-condo não há `condoId` no path → `{ kind: "all" }`; na per-condo há → `{ kind: "condo", condoId }`. Nenhuma prop necessária.

- [ ] **Step 3: Verificação completa (lint + types + testes + build)**

Run:

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

Expected: tudo verde. Atenção a:

- `stylelint`: valores crus barrados → todos os CSS usam tokens.
- `tsc`: sem `any`, optionals omitidas (não `: undefined`).
- `eslint`: handlers com Promise — aqui as mutations são `void` por design (`approve`/`reject` não retornam Promise exposta), então não precisa de wrapper; confirmar que o lint não reclama.

- [ ] **Step 4: Simular CI sem env (lição do projeto)**

Vite carrega `.env.local` mesmo com `env -u`. Para reproduzir CI, renomear temporariamente e rodar os testes:

```bash
mv .env.local .env.local.bak && npm run test ; mv .env.local.bak .env.local
```

Expected: testes verdes sem `.env.local` (os hooks env-bound estão mockados com `vi.mock`). Se algum teste quebrar por carregar `@/lib/env`, faltou mock — corrigir antes do PR.

- [ ] **Step 5: Commit + abrir PR**

```bash
git add src/app/routes/_app/approvals.tsx "src/app/routes/_app/c/\$condoId/approvals.tsx"
git commit -m "feat(plan-6-4): plug ApprovalsPage nas rotas cross-condo e per-condo"
git push -u origin feature/plan-6-4-approvals
```

Abrir PR contra `develop` (usar a skill `pr`). Descrição com checklist de acceptance abaixo + nota dos desvios do handoff (block/unit/botSession omitidos por honestidade de tipo).

---

## Acceptance criteria (do roadmap Slice 6.4)

- [ ] Lista renderiza com avatar (iniciais) / nome / condomínio / telefone mascarado / "Pendente há X".
- [ ] Approve remove o item (via invalidate + refetch) e incrementa "X aprovado(s) nesta sessão".
- [ ] Reject abre confirm; OK chama a mutation e fecha; Cancel mantém.
- [ ] Lista vazia: sem aprovados → "Nenhuma aprovação pendente"; com aprovados na sessão → "Tudo aprovado!".
- [ ] Role gate: rota cross-condo `requireRoleAny("manager")`, per-condo `requireRole("manager")` — **mantidos**, não alterados.
- [ ] Cross-condo faz fan-out só sobre condos manager+ com `X-Condo-ID` por request.
- [ ] `lint` + `typecheck` + `test` + `build` verdes; testes passam sem `.env.local`.

---

## Self-review

**Spec coverage** (escopo do roadmap 6.4):

1. Substituir placeholders nas 2 rotas → Task 9 ✓
2. Header h1 + subtítulo (PENDING + bot Telegram) → Task 8 ✓
3. Card "Moradores PENDING" + banner + lista de ApprovalCard (avatar, nome, condo, telefone mascarado, "Pendente há X", ações) → Tasks 6, 8 ✓ (block/unit/badge-bot omitidos — desvio documentado: Core não fornece)
4. Estados vazio (com/sem aprovados) → Task 8 ✓
5. Confirm modal de rejeitar (Radix Dialog, padrão Plan 4) → Task 7 ✓
6. Endpoints `GET /residents` (filtra PENDING client-side), `PATCH approve/reject` → Tasks 3, 4 ✓
7. Sem repository (TanStack Query + openapi-fetch direto) → Tasks 3, 4 ✓
8. Fan-out cross-condo com X-Condo-ID → Task 3 ✓

**Placeholder scan:** nenhuma task usa "TBD"/"implementar depois"/"add validation"; todo step com código mostra o código. As notas em `>` apontam pontos de verificação contra o codebase real (nomes de token, role do Spinner, comportamento do Modal no jsdom) — são checagens de execução, não placeholders de conteúdo.

**Type consistency:**

- `PendingResident` (Task 1) tem `{ id, name, condoId, condoName, phone?, createdAt? }` — usado igual em Tasks 3, 6, 7, 8 ✓
- `toPendingResident(raw, condoName, fallbackCondoId?)` — chamado em Task 3 como `toPendingResident(r, condo.condoName, condo.condoId)` ✓
- `ResidentActionInput` `{ id, condoId }` (Task 4) — `approve`/`reject` chamados com `{ id: r.id, condoId: r.condoId }` em Task 8 ✓
- `usePendingResidents(scope)` retorna `{ residents, isPending, isError }` — consumido assim em Task 8 ✓
- `Avatar` recebe `{ name, size? }` (Task 5) — usado `<Avatar name=... size="lg" />` em Task 6 ✓
- `ApprovalCard` props `{ resident, onApprove, onReject, busy? }` (Task 6) — usado em Task 8 (sem `busy`, default false) ✓
- `RejectConfirmDialog` props `{ resident, onCancel, onConfirm, busy? }` (Task 7) — usado em Task 8 ✓

Sem divergências encontradas.
