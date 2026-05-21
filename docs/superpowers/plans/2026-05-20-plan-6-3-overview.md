# Overview page (`/` index) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o redirect em `_app/index.tsx` por uma `OverviewPage` cross-condo: KPIs agregados, grid de condomínios (quando >1) e tabela de atividade recente.

**Architecture:** Página em `/` (sempre cross-condo — a rota não tem `condoId`, então `useScope` é sempre `all`). Os tickets de todos os condos vêm de `useTicketsScoped`, que faz **fan-out**: um `GET /tickets` por condo do usuário com header `X-Condo-ID` explícito por request (via `useQueries`, reusando a queryKey `["tickets", condoId]`). KPIs e stats por condo são derivados puros (`ticketStats`). A atividade recente é a própria lista de tickets ordenada por `updated_at` (não o `ActivityRepository`).

**Tech Stack:** React 19, TanStack Query (`useQueries`), TanStack Router (file-based), `openapi-fetch`, CSS Modules + design tokens, Vitest + Testing Library.

**Spec:** `docs/superpowers/plans/2026-05-17-plan-6-pages-parity-design-handoff.md` (Slice 6.3) + handoff `docs/handoff/zivy-wa-green/project/src/page-overview.jsx` + `styles.css:1296–1446`.

**Branch:** `feature/plan-6-3-overview` (criar a partir de `develop` atualizado).

---

## Convenções do projeto a respeitar (não negociáveis)

- **Tipagem honesta:** zero `any`/`as Domain`. Payload de API refinado por `filter(isCompleteTicket)` (já existe).
- **Hooks env-bound em teste:** `@/api/client` importa `@/lib/env` (eager, lança sem `.env.local`). Mockar com `vi.mock` + `vi.hoisted`, **nunca** `vi.spyOn`.
- **`exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`:** tratar `undefined` em acesso a array/record; omitir chave em vez de `prop: undefined`.
- **CSS:** `stylelint-declaration-strict-value` barra valores crus — usar tokens (`var(--...)`). Classes via `styles.x ?? ""`.
- **Handlers com Promise** (`navigate`, `refetch`): envolver em arrow `void`.
- **`useNavigate` com `to` literal + `params`** typecheck sem cast (ver `TicketsPage.tsx`); não precisa de `as unknown as`.

## Decisões / desvios do handoff (já resolvidos — não rediscutir na execução)

1. **Cross-condo via fan-out + header override.** `GET /tickets` só escopa pelo header `X-Condo-ID` global (derivado da URL em `main.tsx`). Em `/` não há `condoId` na URL → header não é setado → cada request do fan-out passa `X-Condo-ID` explícito. Exige Task 1 (`applyAuthHeaders` não sobrescreve header já presente).
2. **Overview é sempre cross-condo (all-mode).** Não existe rota de overview per-condo. Grid de condomínios aparece só quando o usuário tem **>1 condo**; com 1 condo, o título vira o nome do condo e o grid some.
3. **"Urgentes ativos" = `priority === "high"` && `status !== "closed"`** (domínio não tem `urgent`).
4. **Atividade recente = tickets ordenados por `updated_at` desc, slice 6** (colunas Protocolo/Status/Prioridade são campos de `Ticket`). **Sem coluna "Responsável"**: o domínio `Ticket` não tem `assigned_to` e não há componente `Avatar`. Divergência aceita do handoff.
5. **CondoCard degradado:** `/condos/me` (`CondoMembership`) só tem `condoId/condoName/condoSlug/role`. Card mostra `mark` (iniciais derivadas), nome, stats de tickets e barra de progresso. **Sem** city/blocks/units.
6. **Pick de ticket** abre o modal Plan-4 (`/c/$condoId/inbox/$ticketId`): foca o condo (`setLastSelected`) e navega; assim o header fica correto no fetch do detalhe. Substituível pela page-level na Slice 6.5.

## File structure

```
src/api/auth.ts                                     # MODIFICAR (Task 1) — não sobrescrever X-Condo-ID
src/api/auth.test.ts                                # MODIFICAR (Task 1) — caso de override
src/features/tickets/
├── useTicketsScoped.ts + .test.tsx                 # NOVO (Task 2) — fan-out cross-condo
└── ticketStats.ts + .test.ts                       # NOVO (Task 3) — KPI/stats derivadas (puro)
src/features/overview/
├── condoMark.ts + .test.ts                         # NOVO (Task 4) — iniciais do condo
├── KpiRow.tsx + .module.css                        # NOVO (Task 5)
├── CondoCard.tsx + .module.css + .stories.tsx      # NOVO (Task 6)
├── RecentActivityTable.tsx + .module.css           # NOVO (Task 7)
└── OverviewPage.tsx + .test.tsx + .module.css       # NOVO (Task 8)
src/app/routes/_app/index.tsx                       # MODIFICAR (Task 9) — redirect → OverviewPage
```

---

## Task 1: `applyAuthHeaders` não sobrescreve `X-Condo-ID` já presente

**Files:**

- Modify: `src/api/auth.ts`
- Test: `src/api/auth.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

Adicionar dentro do `describe("applyAuthHeaders", ...)` em `src/api/auth.test.ts`:

```ts
it("não sobrescreve X-Condo-ID já presente na request (fan-out cross-condo)", async () => {
  const req = buildRequest();
  req.headers.set("X-Condo-ID", "explicit-condo");
  const out = await applyAuthHeaders(req, {
    getAccessToken: () => Promise.resolve("tok"),
    getActiveCondoId: () => "active-condo",
  });
  expect(out.headers.get("X-Condo-ID")).toBe("explicit-condo");
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/api/auth.test.ts -t "não sobrescreve"`
Expected: FAIL — recebe `"active-condo"` (middleware atual sobrescreve).

- [ ] **Step 3: Implementar o guard**

Em `src/api/auth.ts`, na função `applyAuthHeaders`, trocar:

```ts
const condoId = g.getActiveCondoId();
if (condoId) request.headers.set("X-Condo-ID", condoId);
```

por:

```ts
const condoId = g.getActiveCondoId();
if (condoId && !request.headers.has("X-Condo-ID")) {
  request.headers.set("X-Condo-ID", condoId);
}
```

- [ ] **Step 4: Rodar os testes do arquivo, ver passar**

Run: `npx vitest run src/api/auth.test.ts`
Expected: PASS (todos os casos, incluindo o novo).

- [ ] **Step 5: Commit**

```bash
git add src/api/auth.ts src/api/auth.test.ts
git commit -m "feat(plan-6-3): applyAuthHeaders preserva X-Condo-ID por request (fan-out)"
```

---

## Task 2: `useTicketsScoped` — fan-out cross-condo

**Files:**

- Create: `src/features/tickets/useTicketsScoped.ts`
- Test: `src/features/tickets/useTicketsScoped.test.tsx`

- [ ] **Step 1: Escrever o teste falhando**

```tsx
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

import { useTicketsScoped } from "./useTicketsScoped";

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

afterEach(() => {
  mockGet.mockReset();
  mockUseMyCondos.mockReset();
  vi.restoreAllMocks();
});

describe("useTicketsScoped", () => {
  it("faz fan-out por condo passando X-Condo-ID explícito e agrupa por condo", async () => {
    mockUseMyCondos.mockReturnValue({ data: CONDOS });
    mockGet.mockImplementation((_path: string, opts: { headers: Record<string, string> }) => {
      const condo = opts.headers["X-Condo-ID"];
      return Promise.resolve({
        data: [
          {
            id: `${condo}-t1`,
            protocol: "TKT-1",
            title: "x",
            status: "open",
            priority: "high",
            updated_at: "2026-05-20T00:00:00Z",
          },
        ],
        error: undefined,
      });
    });

    const { result } = renderHook(() => useTicketsScoped(), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockGet).toHaveBeenCalledWith("/tickets", {
      params: { query: {} },
      headers: { "X-Condo-ID": "c1" },
    });
    expect(result.current.byCondo.map((c) => c.condo.condoId)).toEqual(["c1", "c2"]);
    expect(result.current.byCondo[0]?.tickets[0]?.id).toBe("c1-t1");
  });

  it("filtra payloads incompletos via isCompleteTicket", async () => {
    mockUseMyCondos.mockReturnValue({ data: [CONDOS[0]] });
    mockGet.mockResolvedValue({
      data: [
        {
          id: "ok",
          protocol: "TKT-1",
          title: "x",
          status: "open",
          priority: "low",
          updated_at: "2026-05-20T00:00:00Z",
        },
        { id: "bad" },
      ],
      error: undefined,
    });
    const { result } = renderHook(() => useTicketsScoped(), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.byCondo[0]?.tickets.map((t) => t.id)).toEqual(["ok"]);
  });

  it("expõe isError quando alguma chamada falha", async () => {
    mockUseMyCondos.mockReturnValue({ data: [CONDOS[0]] });
    mockGet.mockResolvedValue({ data: undefined, error: { message: "boom" } });
    const { result } = renderHook(() => useTicketsScoped(), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/tickets/useTicketsScoped.test.tsx`
Expected: FAIL — `useTicketsScoped` não existe.

- [ ] **Step 3: Implementar o hook**

```ts
// src/features/tickets/useTicketsScoped.ts
import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Ticket } from "@/types/ticket";
import { isCompleteTicket } from "@/types/ticket";
import { useMyCondos, type CondoMembership } from "@/features/condo/useMyCondos";

async function fetchCondoTickets(condoId: string): Promise<Ticket[]> {
  const { data, error } = await api.GET("/tickets", {
    params: { query: {} },
    headers: { "X-Condo-ID": condoId },
  });
  if (error) {
    throw new Error("TicketsService.fetchByCondo: falha em GET /tickets", { cause: error });
  }
  return (data ?? []).filter(isCompleteTicket);
}

export interface CondoTickets {
  condo: CondoMembership;
  tickets: Ticket[];
}

export interface ScopedTicketsResult {
  byCondo: CondoTickets[];
  isPending: boolean;
  isError: boolean;
}

export function useTicketsScoped(): ScopedTicketsResult {
  const { data: condos } = useMyCondos();
  const list = condos ?? [];

  const results = useQueries({
    queries: list.map((condo) => ({
      queryKey: ["tickets", condo.condoId] as const,
      queryFn: () => fetchCondoTickets(condo.condoId),
      staleTime: 10_000,
    })),
  });

  const byCondo: CondoTickets[] = list.map((condo, i) => ({
    condo,
    tickets: results[i]?.data ?? [],
  }));

  return {
    byCondo,
    isPending: condos === undefined || results.some((r) => r.isPending),
    isError: results.some((r) => r.isError),
  };
}
```

- [ ] **Step 4: Rodar o teste, ver passar**

Run: `npx vitest run src/features/tickets/useTicketsScoped.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/tickets/useTicketsScoped.ts src/features/tickets/useTicketsScoped.test.tsx
git commit -m "feat(plan-6-3): useTicketsScoped — fan-out GET /tickets por condo"
```

---

## Task 3: `ticketStats` — KPIs/stats derivadas (puro)

**Files:**

- Create: `src/features/tickets/ticketStats.ts`
- Test: `src/features/tickets/ticketStats.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

```ts
import { describe, expect, it } from "vitest";
import type { Ticket } from "@/types/ticket";
import { ticketStats } from "./ticketStats";

function mk(partial: Partial<Ticket>): Ticket {
  return {
    id: "t",
    protocol: "TKT-1",
    title: "x",
    status: "open",
    priority: "low",
    updated_at: "2026-05-20T00:00:00Z",
    ...partial,
  };
}

describe("ticketStats", () => {
  it("conta open/in_progress/resolved", () => {
    const stats = ticketStats([
      mk({ status: "open" }),
      mk({ status: "open" }),
      mk({ status: "in_progress" }),
      mk({ status: "resolved" }),
      mk({ status: "closed" }),
    ]);
    expect(stats).toMatchObject({ open: 2, inProgress: 1, resolved: 1 });
  });

  it("urgent = priority high e status != closed", () => {
    const stats = ticketStats([
      mk({ priority: "high", status: "open" }),
      mk({ priority: "high", status: "closed" }), // não conta
      mk({ priority: "medium", status: "open" }), // não conta
    ]);
    expect(stats.urgent).toBe(1);
  });

  it("lista vazia → zeros", () => {
    expect(ticketStats([])).toEqual({ open: 0, inProgress: 0, resolved: 0, urgent: 0 });
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/tickets/ticketStats.test.ts`
Expected: FAIL — `ticketStats` não existe.

- [ ] **Step 3: Implementar**

```ts
// src/features/tickets/ticketStats.ts
import type { Ticket } from "@/types/ticket";

export interface TicketStats {
  open: number;
  inProgress: number;
  resolved: number;
  urgent: number;
}

export function ticketStats(tickets: Ticket[]): TicketStats {
  return {
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    urgent: tickets.filter((t) => t.priority === "high" && t.status !== "closed").length,
  };
}
```

- [ ] **Step 4: Rodar o teste, ver passar**

Run: `npx vitest run src/features/tickets/ticketStats.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/tickets/ticketStats.ts src/features/tickets/ticketStats.test.ts
git commit -m "feat(plan-6-3): ticketStats — derivação pura de KPIs (urgent = high ativo)"
```

---

## Task 4: `condoMark` — iniciais do condomínio

**Files:**

- Create: `src/features/overview/condoMark.ts`
- Test: `src/features/overview/condoMark.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

```ts
import { describe, expect, it } from "vitest";
import { condoMark } from "./condoMark";

describe("condoMark", () => {
  it("duas palavras → inicial da primeira + última", () => {
    expect(condoMark("Solar das Flores")).toBe("SF");
  });
  it("uma palavra → duas primeiras letras", () => {
    expect(condoMark("Vista")).toBe("VI");
  });
  it("string vazia → ?", () => {
    expect(condoMark("   ")).toBe("?");
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/overview/condoMark.test.ts`
Expected: FAIL — `condoMark` não existe.

- [ ] **Step 3: Implementar**

```ts
// src/features/overview/condoMark.ts
export function condoMark(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const first = words[0];
  if (!first) return "?";
  if (words.length === 1) return first.slice(0, 2).toUpperCase();
  const last = words[words.length - 1] ?? first;
  const a = first[0] ?? "";
  const b = last[0] ?? "";
  return (a + b).toUpperCase();
}
```

- [ ] **Step 4: Rodar o teste, ver passar**

Run: `npx vitest run src/features/overview/condoMark.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/features/overview/condoMark.ts src/features/overview/condoMark.test.ts
git commit -m "feat(plan-6-3): condoMark — iniciais do condomínio para o CondoCard"
```

---

## Task 5: `KpiRow` — 4 cards de KPI

**Files:**

- Create: `src/features/overview/KpiRow.tsx`
- Create: `src/features/overview/KpiRow.module.css`
- Test: (coberto via `OverviewPage.test.tsx` na Task 8 — KpiRow é apresentacional puro)

- [ ] **Step 1: Criar o CSS Module**

```css
/* src/features/overview/KpiRow.module.css */
.row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.kpi {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.label {
  font-size: var(--fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-tertiary);
  font-weight: var(--fw-medium);
}

.num {
  font-size: var(--fs-3xl);
  font-weight: var(--fw-semibold);
  letter-spacing: var(--tracking-tighter);
  margin-top: var(--space-1);
  color: var(--fg-primary);
}

.brand {
  color: var(--brand);
}

.urgent {
  color: var(--status-urgent-fg);
}

.sub {
  font-size: var(--fs-xs);
  color: var(--fg-tertiary);
  margin-top: var(--space-1);
}

@media (max-width: 720px) {
  .row {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

- [ ] **Step 2: Implementar o componente**

```tsx
// src/features/overview/KpiRow.tsx
import type { TicketStats } from "@/features/tickets/ticketStats";
import styles from "./KpiRow.module.css";

interface Props {
  stats: TicketStats;
}

export function KpiRow({ stats }: Props) {
  return (
    <div className={styles.row}>
      <div className={styles.kpi}>
        <div className={styles.label}>Abertos</div>
        <div className={styles.num}>{stats.open}</div>
        <div className={styles.sub}>aguardando triagem ou atribuição</div>
      </div>
      <div className={styles.kpi}>
        <div className={styles.label}>Em andamento</div>
        <div className={`${styles.num} ${styles.brand ?? ""}`}>{stats.inProgress}</div>
        <div className={styles.sub}>com responsável ativo</div>
      </div>
      <div className={styles.kpi}>
        <div className={styles.label}>Resolvidos</div>
        <div className={styles.num}>{stats.resolved}</div>
        <div className={styles.sub}>prontos para fechamento</div>
      </div>
      <div className={styles.kpi}>
        <div className={styles.label}>Urgentes ativos</div>
        <div className={`${styles.num} ${styles.urgent ?? ""}`}>{stats.urgent}</div>
        <div className={styles.sub}>prioridade alta em aberto</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/features/overview/KpiRow.tsx src/features/overview/KpiRow.module.css
git commit -m "feat(plan-6-3): KpiRow — 4 cards de KPI agregados"
```

---

## Task 6: `CondoCard` — card de condomínio clicável

**Files:**

- Create: `src/features/overview/CondoCard.tsx`
- Create: `src/features/overview/CondoCard.module.css`
- Create: `src/features/overview/CondoCard.stories.tsx`
- Test: `src/features/overview/CondoCard.test.tsx`

- [ ] **Step 1: Escrever o teste falhando**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { CondoMembership } from "@/features/condo/useMyCondos";
import { CondoCard } from "./CondoCard";

const CONDO: CondoMembership = {
  condoId: "c1",
  condoName: "Solar das Flores",
  condoSlug: "solar",
  role: "manager",
};
const STATS = { open: 3, inProgress: 2, resolved: 5, urgent: 1 };

describe("CondoCard", () => {
  it("mostra mark, nome e stats", () => {
    render(<CondoCard condo={CONDO} stats={STATS} onFocus={vi.fn()} />);
    expect(screen.getByText("SF")).toBeInTheDocument();
    expect(screen.getByText("Solar das Flores")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("clique chama onFocus com o condoId", () => {
    const onFocus = vi.fn();
    render(<CondoCard condo={CONDO} stats={STATS} onFocus={onFocus} />);
    fireEvent.click(screen.getByRole("button", { name: /solar das flores/i }));
    expect(onFocus).toHaveBeenCalledWith("c1");
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/overview/CondoCard.test.tsx`
Expected: FAIL — `CondoCard` não existe.

- [ ] **Step 3: Criar o CSS Module**

```css
/* src/features/overview/CondoCard.module.css */
.card {
  position: relative;
  overflow: hidden;
  width: 100%;
  text-align: left;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  cursor: pointer;
  font: inherit;
  color: inherit;
  transition:
    box-shadow var(--duration-base) var(--easing-standard),
    transform var(--duration-fast) var(--easing-standard),
    border-color var(--duration-fast) var(--easing-standard);
}

.card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 3px;
  background: var(--brand);
}

.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
  border-color: var(--border-strong);
}

.card:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

.head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.mark {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--brand-soft);
  color: var(--brand);
  display: grid;
  place-items: center;
  font-weight: var(--fw-bold);
  font-size: var(--fs-base);
}

.name {
  margin: 0;
  font-size: var(--fs-base);
  font-weight: var(--fw-semibold);
  color: var(--fg-primary);
}

.stats {
  display: flex;
  gap: var(--space-5);
  margin-top: var(--space-3);
}

.stat {
  display: flex;
  flex-direction: column;
}

.statNum {
  font-size: var(--fs-xl);
  font-weight: var(--fw-semibold);
  color: var(--fg-primary);
  line-height: 1.1;
}

.statLab {
  font-size: var(--fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-tertiary);
  font-weight: var(--fw-medium);
}

.statUrgent .statNum {
  color: var(--status-urgent-fg);
}

.progress {
  height: 5px;
  background: var(--bg-muted);
  border-radius: var(--radius-pill);
  margin-top: var(--space-3);
  overflow: hidden;
  display: flex;
}

.progress i {
  display: block;
  height: 100%;
}

.pOpen {
  background: var(--info-fg);
}

.pProg {
  background: var(--status-onhold-fg);
}

.pRes {
  background: var(--success);
}
```

- [ ] **Step 4: Implementar o componente**

```tsx
// src/features/overview/CondoCard.tsx
import type { CondoMembership } from "@/features/condo/useMyCondos";
import type { TicketStats } from "@/features/tickets/ticketStats";
import { condoMark } from "./condoMark";
import styles from "./CondoCard.module.css";

interface Props {
  condo: CondoMembership;
  stats: TicketStats;
  onFocus: (condoId: string) => void;
}

export function CondoCard({ condo, stats, onFocus }: Props) {
  const total = stats.open + stats.inProgress + stats.resolved;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <button type="button" className={styles.card} onClick={() => onFocus(condo.condoId)}>
      <div className={styles.head}>
        <div className={styles.mark}>{condoMark(condo.condoName)}</div>
        <h3 className={styles.name}>{condo.condoName}</h3>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{stats.open}</span>
          <span className={styles.statLab}>Abertos</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{stats.inProgress}</span>
          <span className={styles.statLab}>Em curso</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{stats.resolved}</span>
          <span className={styles.statLab}>Resolvidos</span>
        </div>
        <div className={`${styles.stat} ${stats.urgent > 0 ? (styles.statUrgent ?? "") : ""}`}>
          <span className={styles.statNum}>{stats.urgent}</span>
          <span className={styles.statLab}>Urgentes</span>
        </div>
      </div>
      <div className={styles.progress}>
        <i className={styles.pOpen} style={{ width: `${pct(stats.open)}%` }} />
        <i className={styles.pProg} style={{ width: `${pct(stats.inProgress)}%` }} />
        <i className={styles.pRes} style={{ width: `${pct(stats.resolved)}%` }} />
      </div>
    </button>
  );
}
```

- [ ] **Step 5: Criar a story**

```tsx
// src/features/overview/CondoCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { CondoCard } from "./CondoCard";

const meta: Meta<typeof CondoCard> = {
  title: "Overview/CondoCard",
  component: CondoCard,
  args: {
    condo: { condoId: "c1", condoName: "Solar das Flores", condoSlug: "solar", role: "manager" },
    stats: { open: 3, inProgress: 2, resolved: 5, urgent: 1 },
    onFocus: () => undefined,
  },
};
export default meta;

type Story = StoryObj<typeof CondoCard>;

export const Default: Story = {};
export const SemUrgentes: Story = {
  args: { stats: { open: 1, inProgress: 0, resolved: 4, urgent: 0 } },
};
```

- [ ] **Step 6: Rodar o teste, ver passar**

Run: `npx vitest run src/features/overview/CondoCard.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 7: Commit**

```bash
git add src/features/overview/CondoCard.tsx src/features/overview/CondoCard.module.css src/features/overview/CondoCard.stories.tsx src/features/overview/CondoCard.test.tsx
git commit -m "feat(plan-6-3): CondoCard — card clicável com stats + barra de progresso"
```

---

## Task 7: `RecentActivityTable` — tabela de atividade recente

**Files:**

- Create: `src/features/overview/RecentActivityTable.tsx`
- Create: `src/features/overview/RecentActivityTable.module.css`
- Test: `src/features/overview/RecentActivityTable.test.tsx`

- [ ] **Step 1: Escrever o teste falhando**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Ticket } from "@/types/ticket";
import { RecentActivityTable, type RecentRow } from "./RecentActivityTable";

function mkRow(over: Partial<Ticket>, condoName: string, condoId: string): RecentRow {
  return {
    condoId,
    condoName,
    ticket: {
      id: `${condoId}-t`,
      protocol: "TKT-9",
      title: "Vazamento",
      status: "open",
      priority: "high",
      updated_at: "2026-05-20T00:00:00Z",
      ...over,
    },
  };
}

describe("RecentActivityTable", () => {
  it("mostra coluna Condomínio quando showCondo", () => {
    render(<RecentActivityTable rows={[mkRow({}, "Solar", "c1")]} showCondo onPick={vi.fn()} />);
    expect(screen.getByText("Condomínio")).toBeInTheDocument();
    expect(screen.getByText("Solar")).toBeInTheDocument();
  });

  it("esconde coluna Condomínio quando !showCondo", () => {
    render(
      <RecentActivityTable rows={[mkRow({}, "Solar", "c1")]} showCondo={false} onPick={vi.fn()} />,
    );
    expect(screen.queryByText("Condomínio")).not.toBeInTheDocument();
  });

  it("clique na linha chama onPick com condoId e ticketId", () => {
    const onPick = vi.fn();
    render(<RecentActivityTable rows={[mkRow({}, "Solar", "c1")]} showCondo onPick={onPick} />);
    fireEvent.click(screen.getByRole("button", { name: /vazamento/i }));
    expect(onPick).toHaveBeenCalledWith("c1", "c1-t");
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/overview/RecentActivityTable.test.tsx`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Criar o CSS Module**

```css
/* src/features/overview/RecentActivityTable.module.css */
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.wrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-sm);
}

.table th {
  text-align: left;
  padding: var(--space-3) var(--space-4);
  font-size: var(--fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-tertiary);
  font-weight: var(--fw-medium);
  border-bottom: 1px solid var(--border);
}

.table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
  color: var(--fg-primary);
}

.table tr:last-child td {
  border-bottom: none;
}

.row {
  cursor: pointer;
}

.row:hover {
  background: var(--bg-muted);
}

.proto {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--fg-secondary);
}

.title {
  font-weight: var(--fw-medium);
}

.sub {
  font-size: var(--fs-xs);
  color: var(--fg-tertiary);
  margin-top: 2px;
}

.condo {
  font-size: var(--fs-xs);
  color: var(--fg-secondary);
}

.time {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--fg-tertiary);
}
```

- [ ] **Step 4: Implementar o componente**

```tsx
// src/features/overview/RecentActivityTable.tsx
import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { PriorityChip } from "@/ui/PriorityChip/PriorityChip";
import { formatRelTime } from "@/lib/formatRelTime";
import type { Ticket } from "@/types/ticket";
import styles from "./RecentActivityTable.module.css";

export interface RecentRow {
  ticket: Ticket;
  condoId: string;
  condoName: string;
}

interface Props {
  rows: RecentRow[];
  showCondo: boolean;
  onPick: (condoId: string, ticketId: string) => void;
}

function locationLabel(t: Ticket): string {
  if (t.common_area_name) return t.common_area_name;
  if (t.block_name && t.unit_number) return `${t.block_name} · ${t.unit_number}`;
  if (t.unit_number) return t.unit_number;
  return "—";
}

export function RecentActivityTable({ rows, showCondo, onPick }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.wrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Protocolo</th>
              <th>Chamado</th>
              {showCondo ? <th>Condomínio</th> : null}
              <th>Status</th>
              <th>Prioridade</th>
              <th>Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ ticket, condoId, condoName }) => (
              <tr
                key={ticket.id}
                role="button"
                tabIndex={0}
                aria-label={`Abrir ${ticket.title}`}
                className={styles.row}
                onClick={() => onPick(condoId, ticket.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onPick(condoId, ticket.id);
                  }
                }}
              >
                <td className={styles.proto}>{ticket.protocol}</td>
                <td>
                  <div className={styles.title}>{ticket.title}</div>
                  <div className={styles.sub}>
                    {locationLabel(ticket)}
                    {ticket.resident_name ? ` · ${ticket.resident_name}` : ""}
                  </div>
                </td>
                {showCondo ? <td className={styles.condo}>{condoName}</td> : null}
                <td>
                  <StatusBadge status={ticket.status} />
                </td>
                <td>
                  <PriorityChip priority={ticket.priority} />
                </td>
                <td className={styles.time}>{formatRelTime(ticket.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Rodar o teste, ver passar**

Run: `npx vitest run src/features/overview/RecentActivityTable.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 6: Commit**

```bash
git add src/features/overview/RecentActivityTable.tsx src/features/overview/RecentActivityTable.module.css src/features/overview/RecentActivityTable.test.tsx
git commit -m "feat(plan-6-3): RecentActivityTable — últimos tickets por updated_at"
```

---

## Task 8: `OverviewPage` — composição

**Files:**

- Create: `src/features/overview/OverviewPage.tsx`
- Create: `src/features/overview/OverviewPage.module.css`
- Test: `src/features/overview/OverviewPage.test.tsx`

- [ ] **Step 1: Escrever o teste falhando**

```tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { CondoMembership } from "@/features/condo/useMyCondos";
import type { CondoTickets } from "@/features/tickets/useTicketsScoped";
import type { Ticket } from "@/types/ticket";

const { mockUseMyCondos, mockUseTicketsScoped, mockNavigate, mockSetLastSelected } = vi.hoisted(
  () => ({
    mockUseMyCondos: vi.fn(),
    mockUseTicketsScoped: vi.fn(),
    mockNavigate: vi.fn(),
    mockSetLastSelected: vi.fn(),
  }),
);
vi.mock("@/features/condo/useMyCondos", () => ({ useMyCondos: mockUseMyCondos }));
vi.mock("@/features/tickets/useTicketsScoped", () => ({ useTicketsScoped: mockUseTicketsScoped }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mockNavigate }));
vi.mock("@/stores/activeCondo", () => ({ setLastSelected: mockSetLastSelected }));

import { OverviewPage } from "./OverviewPage";

function mkTicket(over: Partial<Ticket>): Ticket {
  return {
    id: "t",
    protocol: "TKT-1",
    title: "Chamado",
    status: "open",
    priority: "high",
    updated_at: "2026-05-20T00:00:00Z",
    ...over,
  };
}
const condo = (id: string, name: string): CondoMembership => ({
  condoId: id,
  condoName: name,
  condoSlug: id,
  role: "manager",
});

afterEach(() => {
  vi.restoreAllMocks();
  mockUseMyCondos.mockReset();
  mockUseTicketsScoped.mockReset();
  mockNavigate.mockReset();
  mockSetLastSelected.mockReset();
});

describe("OverviewPage", () => {
  it("multi-condo: título 'Visão geral', grid e KPIs agregados", () => {
    const byCondo: CondoTickets[] = [
      { condo: condo("c1", "Solar"), tickets: [mkTicket({ id: "a", status: "open" })] },
      { condo: condo("c2", "Vista"), tickets: [mkTicket({ id: "b", status: "resolved" })] },
    ];
    mockUseMyCondos.mockReturnValue({ data: byCondo.map((c) => c.condo) });
    mockUseTicketsScoped.mockReturnValue({ byCondo, isPending: false, isError: false });

    render(<OverviewPage />);
    expect(screen.getByRole("heading", { name: "Visão geral" })).toBeInTheDocument();
    expect(screen.getByText("Condomínios")).toBeInTheDocument();
    // 1 open agregado
    expect(screen.getByText("Abertos").parentElement).toHaveTextContent("1");
  });

  it("condo único: título com nome do condo e sem grid", () => {
    const byCondo: CondoTickets[] = [{ condo: condo("c1", "Solar"), tickets: [mkTicket({})] }];
    mockUseMyCondos.mockReturnValue({ data: byCondo.map((c) => c.condo) });
    mockUseTicketsScoped.mockReturnValue({ byCondo, isPending: false, isError: false });

    render(<OverviewPage />);
    expect(screen.getByRole("heading", { name: "Solar" })).toBeInTheDocument();
    expect(screen.queryByText("Condomínios")).not.toBeInTheDocument();
  });

  it("clique no condo card foca e navega para /c/<id>/inbox", () => {
    const byCondo: CondoTickets[] = [
      { condo: condo("c1", "Solar"), tickets: [] },
      { condo: condo("c2", "Vista"), tickets: [] },
    ];
    mockUseMyCondos.mockReturnValue({ data: byCondo.map((c) => c.condo) });
    mockUseTicketsScoped.mockReturnValue({ byCondo, isPending: false, isError: false });

    render(<OverviewPage />);
    fireEvent.click(screen.getByRole("button", { name: /vista/i }));
    expect(mockSetLastSelected).toHaveBeenCalledWith("c2");
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/c/$condoId/inbox",
      params: { condoId: "c2" },
    });
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/overview/OverviewPage.test.tsx`
Expected: FAIL — `OverviewPage` não existe.

- [ ] **Step 3: Criar o CSS Module**

```css
/* src/features/overview/OverviewPage.module.css */
.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-5);
  margin-bottom: var(--space-5);
}

.title {
  font-size: var(--fs-2xl);
  font-weight: var(--fw-semibold);
  letter-spacing: var(--tracking-tight);
  margin: 0 0 var(--space-1);
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

.sectionHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.sectionTitle {
  margin: 0;
  font-size: var(--fs-base);
  font-weight: var(--fw-semibold);
  color: var(--fg-primary);
}

.sectionHint {
  font-size: var(--fs-xs);
  color: var(--fg-tertiary);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
```

- [ ] **Step 4: Implementar o componente**

```tsx
// src/features/overview/OverviewPage.tsx
import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Filter, Table } from "lucide-react";
import { Button } from "@/ui/Button/Button";
import { Spinner } from "@/ui/Spinner/Spinner";
import { setLastSelected } from "@/stores/activeCondo";
import { useMyCondos } from "@/features/condo/useMyCondos";
import { useTicketsScoped } from "@/features/tickets/useTicketsScoped";
import { ticketStats } from "@/features/tickets/ticketStats";
import { KpiRow } from "./KpiRow";
import { CondoCard } from "./CondoCard";
import { RecentActivityTable, type RecentRow } from "./RecentActivityTable";
import styles from "./OverviewPage.module.css";

export function OverviewPage() {
  const navigate = useNavigate();
  const { data: condos } = useMyCondos();
  const { byCondo, isPending, isError } = useTicketsScoped();

  const allTickets = useMemo(() => byCondo.flatMap((c) => c.tickets), [byCondo]);
  const kpis = useMemo(() => ticketStats(allTickets), [allTickets]);

  const recent: RecentRow[] = useMemo(() => {
    const rows = byCondo.flatMap((c) =>
      c.tickets.map((ticket) => ({
        ticket,
        condoId: c.condo.condoId,
        condoName: c.condo.condoName,
      })),
    );
    return rows.sort((a, b) => b.ticket.updated_at.localeCompare(a.ticket.updated_at)).slice(0, 6);
  }, [byCondo]);

  const multi = byCondo.length > 1;
  const title = multi ? "Visão geral" : (byCondo[0]?.condo.condoName ?? "Visão geral");
  const subtitle = multi
    ? `Operação consolidada de ${byCondo.length} condomínios.`
    : "Status operacional do condomínio.";

  function focusCondo(condoId: string) {
    setLastSelected(condoId);
    void navigate({ to: "/c/$condoId/inbox", params: { condoId } });
  }

  function pickTicket(condoId: string, ticketId: string) {
    setLastSelected(condoId);
    void navigate({ to: "/c/$condoId/inbox/$ticketId", params: { condoId, ticketId } });
  }

  function goToTickets() {
    const target = byCondo[0]?.condo.condoId ?? condos?.[0]?.condoId;
    if (!target) return;
    setLastSelected(target);
    void navigate({ to: "/c/$condoId/tickets", params: { condoId: target } });
  }

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.sub}>{subtitle}</p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" disabled title="Em breve">
            <Filter size={14} /> Período
          </Button>
          <Button onClick={goToTickets}>
            <Table size={14} /> Ver chamados
          </Button>
        </div>
      </header>

      {isError ? (
        <p role="alert" className={styles.sub}>
          Não foi possível carregar todos os condomínios. Mostrando o que veio.
        </p>
      ) : null}

      <KpiRow stats={kpis} />

      {multi ? (
        <>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Condomínios</h2>
            <span className={styles.sectionHint}>Clique para focar o contexto</span>
          </div>
          <div className={styles.grid}>
            {byCondo.map((c) => (
              <CondoCard
                key={c.condo.condoId}
                condo={c.condo}
                stats={ticketStats(c.tickets)}
                onFocus={focusCondo}
              />
            ))}
          </div>
        </>
      ) : null}

      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Atividade recente</h2>
      </div>
      {isPending ? (
        <Spinner />
      ) : (
        <RecentActivityTable rows={recent} showCondo={multi} onPick={pickTicket} />
      )}
    </>
  );
}
```

- [ ] **Step 5: Rodar o teste, ver passar**

Run: `npx vitest run src/features/overview/OverviewPage.test.tsx`
Expected: PASS (3 testes).

> **Nota sobre o mock de `@tanstack/react-router`:** o teste mocka o módulo inteiro expondo só `useNavigate`. Se algum import adicional do router for usado no componente, adicionar ao mock factory.

- [ ] **Step 6: Commit**

```bash
git add src/features/overview/OverviewPage.tsx src/features/overview/OverviewPage.module.css src/features/overview/OverviewPage.test.tsx
git commit -m "feat(plan-6-3): OverviewPage — KPIs + grid de condos + atividade recente"
```

---

## Task 9: Plug na rota `_app/index.tsx`

**Files:**

- Modify: `src/app/routes/_app/index.tsx`

- [ ] **Step 1: Substituir o redirect pela página**

Substituir todo o conteúdo de `src/app/routes/_app/index.tsx` por:

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { myCondosQueryOptions } from "@/features/condo/useMyCondos";
import { OverviewPage } from "@/features/overview/OverviewPage";

export const Route = createFileRoute("/_app/")({
  beforeLoad: async ({ context }) => {
    const condos = await context.queryClient.ensureQueryData(myCondosQueryOptions());
    if (condos.length === 0) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/no-access" });
    }
  },
  component: OverviewPage,
});
```

> O guard de 0-condos permanece. O redirect que mandava para `/c/<id>/inbox` sai — `/` passa a ser a landing real (Overview). O switcher "Todos" da Topbar continua apontando para `/`.

- [ ] **Step 2: Confirmar que o routeTree não muda de estrutura**

O path da rota (`/_app/`) não mudou — só ganhou `component`. Rodar o dev server por alguns segundos para deixar o `TanStackRouterVite` regenerar e então **matar o PID** (ver CLAUDE.md — processo órfão regenera em loop):

```bash
npm run dev & DEV_PID=$!; sleep 6; kill $DEV_PID
git status --short src/app/routeTree.gen.ts
```

Se `routeTree.gen.ts` aparecer modificado, incluir no commit; se não, seguir.

- [ ] **Step 3: Typecheck + testes do feature**

Run: `npm run typecheck && npx vitest run src/features/overview src/features/tickets`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/routes/_app/index.tsx src/app/routeTree.gen.ts
git commit -m "feat(plan-6-3): rota / renderiza OverviewPage (sai redirect p/ inbox)"
```

---

## Task 10: Verificação final e PR

**Files:** nenhum novo.

- [ ] **Step 1: Lint + typecheck + testes + build**

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

Expected: tudo verde.

- [ ] **Step 2: Suíte verde sem `.env.local` (simular CI)**

```bash
mv .env.local .env.local.bak && npx vitest run; mv .env.local.bak .env.local
```

Expected: PASS (hooks env-bound mockados com `vi.mock`).

- [ ] **Step 3: Smoke manual**

- [ ] Usuário com >1 condo em `/` → título "Visão geral", KPIs agregados, grid de condos, atividade recente com coluna Condomínio.
- [ ] Clique num condo card → foca e vai para `/c/<id>/inbox`.
- [ ] Usuário com 1 condo → título = nome do condo, sem grid, atividade sem coluna Condomínio.
- [ ] Clique numa linha da atividade → abre o modal de detalhe (`/c/<id>/inbox/<ticketId>`).
- [ ] "Ver chamados" navega para `/c/<id>/tickets`.

- [ ] **Step 4: Push + abrir PR (skill `pr`)**

Usar a skill `pr` (PR contra `develop`). Incluir no corpo: decisões/desvios (Urgentes=high, sem coluna Responsável, CondoCard degradado, fan-out + header override) e o test plan.

---

## Self-review

**Cobertura da spec (Slice 6.3):**

- [x] (1) Redirect → OverviewPage em `_app/index.tsx` — Task 9.
- [x] (2) Header com título all/condo + subtítulo + ações Período (placeholder) e Ver chamados — Task 8.
- [x] (3) KPI row (4 cards) derivados de tickets cross-condo — Tasks 2, 3, 5, 8.
- [x] (4) Seção Condomínios (grid) só em multi-condo, click foca scope — Tasks 6, 8.
- [x] (5) Tabela atividade recente (6 últimas) — Tasks 7, 8.

**Desvios documentados (não são gaps):**

- Overview é só all-mode (não há rota condo-scoped); grid aparece com >1 condo.
- "Atividade recente" deriva de tickets (não do `ActivityRepository`); sem coluna "Responsável" (domínio sem `assigned_to`, sem `Avatar`).
- CondoCard sem city/blocks/units (API não fornece).

**Type consistency:** `TicketStats` (`open/inProgress/resolved/urgent`) usado igual em `ticketStats`, `KpiRow`, `CondoCard`, `OverviewPage`. `CondoTickets`/`ScopedTicketsResult` de `useTicketsScoped` consumidos com os mesmos nomes em `OverviewPage`. `RecentRow` (`ticket/condoId/condoName`) idêntico entre `RecentActivityTable` e o builder em `OverviewPage`.

**Placeholder scan:** sem TODO/TBD; todo step de código tem código completo.

---

## Execution Handoff

Plan completo e salvo em `docs/superpowers/plans/2026-05-20-plan-6-3-overview.md`.
