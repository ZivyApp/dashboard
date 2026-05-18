# Plan 6 — Pages parity com handoff WA Green

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trazer as páginas do dashboard à paridade visual e funcional com o design handoff `Zivy Dashboard WA Green` (vendorado em `docs/handoff/zivy-wa-green/`), em slices independentes contra `develop`.

**Architecture:** Seis slices (+1 follow-up) independentes. O AppShell, tokens e Activity Feed já bateram com o handoff em Plans 4–5 — Plan 6 é exclusivamente trabalho de **páginas**: completar header da Inbox, construir Tickets page (reaproveitando o `InboxPage` antigo já dead-code), construir Overview (`/` index) com KPIs + condo grid, construir Approvals MVP, migrar Ticket detail de modal para page com timeline+composer, e CRUD de estrutura (Blocos/Unidades/Áreas). Cada slice = 1 PR contra `develop`. **Backend pronto:** `core@develop` já expõe todos os endpoints necessários (tickets CRUD + events + export, residents approve/reject, blocks/units/common-areas CRUD) — sem necessidade de mocks ou repository patterns nesta plan.

**Tech Stack:** Vite 5, React 19, TanStack Router (file-based), TanStack Query, Radix Dialog/DropdownMenu/Select, lucide-react ^1.14, CSS Modules + design tokens, Vitest + Testing Library, Storybook 8.

---

## Como este plano está estruturado

Slices **6.1 e 6.2** estão totalmente detalhadas em bite-sized tasks com código pronto pra colar — são as próximas a executar e cabem em uma sequência sem ficar stale.

Slices **6.3–6.6** estão no **Roadmap Appendix** com escopo, file structure, acceptance criteria e referência aos arquivos do handoff. Cada uma vai ganhar seu próprio plan file (`2026-XX-XX-plan-6-N-*.md`) quando entrar na fila — escrever bite-sized tasks pra todas agora geraria ~3 mil linhas que ficariam stale antes de executar (lição do Plan 5, que dividiu Slice 5.4 em plan separado por essa mesma razão).

---

## Handoff (ground truth)

O design oficial está vendorado em `docs/handoff/zivy-wa-green/`. Sempre que uma task tocar em visual, **abrir o arquivo correspondente do handoff e usar como referência canônica**.

| Pergunta                                          | Onde olhar                                                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Inbox page-header (h1, page-sub, actions row)     | `docs/handoff/zivy-wa-green/project/src/page-inbox.jsx:36–56` + `.page-header` em `styles.css:485–500`                    |
| Tickets — header, filter bar, table/cards/kanban  | `docs/handoff/zivy-wa-green/project/src/page-tickets.jsx` (200 linhas, tudo dentro)                                       |
| Tickets — estilos de tabela, cards, kanban        | `styles.css`: `.t` (433), `.cards-grid` + `.ticket-card` (604), `.kanban` + `.k-card` (577), `.filter-bar` + `.seg` (499) |
| Overview — KPI row, condo grid, atividade recente | `docs/handoff/zivy-wa-green/project/src/page-overview.jsx` (153 linhas)                                                   |
| Overview — estilos KPI/condo card                 | `styles.css`: `.kpi-row` + `.kpi` (629), `.condo-grid` + `.condo-card` + `.cc-progress` (638–666)                         |
| Ticket detail — timeline + composer + actions row | `docs/handoff/zivy-wa-green/project/src/page-ticket-detail.jsx` (146 linhas)                                              |
| Ticket detail — timeline e composer CSS           | `styles.css`: `.timeline` (531), `.composer` (561)                                                                        |
| Approvals — approval-card, ações                  | `docs/handoff/zivy-wa-green/project/src/page-approvals.jsx` (140 linhas) + `.approval-card` em `styles.css:723–732`       |
| CRUD — tabela, modal, confirm-delete              | `docs/handoff/zivy-wa-green/project/src/page-crud.jsx` (249 linhas)                                                       |
| Tokens (estão alinhados ao real)                  | `theme-wa-green.css` (33 linhas) + `styles.css:1–105`                                                                     |

**Princípio:** o handoff é HTML/CSS/JSX puro com classes globais; nosso job é portar para o stack real (TanStack Router + CSS Modules + R19 + TanStack Query + Radix) preservando o **resultado visual e o vocabulário de tokens**, não a estrutura interna do protótipo. Classes globais do handoff (`.kpi`, `.condo-card`, `.t`, `.seg`, `.composer` etc.) viram **CSS Modules locais** em cada componente, copiando a regra do styles.css ipsis litteris (apenas escopando).

---

## Convenções (lembretes obrigatórios — todas as tasks)

Estas convenções vêm do CLAUDE.md e das lições dos Plans 2–5. **Releitura obrigatória antes de cada slice.**

- **Branches:** sair sempre de `develop` atualizada. `feature/plan-6-1-inbox-header`, `feature/plan-6-2-tickets-page`, etc.
- **TDD onde aplicável:** componentes com lógica (hooks, repositórios, filtros, ordenação) entram com teste falhando primeiro. Componentes apresentacionais puros (linha de KPI, célula de tabela) podem entrar sem teste dedicado — Storybook cobre.
- **Commits frequentes:** uma feature por commit; um teste passando antes do commit.
- **TypeScript strict:** `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` ativos. Acessos a array/record tratam `undefined`; props opcionais omitem a chave em vez de `prop: undefined`. Classes CSS de `Record<Variant, string>` com fallback `?? ""`.
- **`type="button"`:** todos os botões dentro de qualquer wrapper que possa estar em form.
- **Tokens semânticos:** cores via CSS custom properties já registradas em `src/design-tokens/` (Plans 2 e 5). **Não criar tokens novos** — todos os valores do handoff já existem no codebase.
- **Handlers com Promise:** envolver em arrow `() => { void something(); }`.
- **`safeStorage()`:** qualquer escrita em `localStorage` em paths críticos passa por `src/stores/theme.ts` helper.
- **Mocks env-bound:** hooks que importam `@/api/client` ou `@/lib/env` usam `vi.mock` com `vi.hoisted`, nunca `vi.spyOn`.
- **Type guards sobre cast:** `openapi-typescript` gera tudo opcional; usar `isCompleteX(t): t is X` + `filter(isCompleteX)` ou `throw` descritivo. Nada de `as Domain`.
- **Guards de role:** rotas protegidas via `beforeLoad` (`requireRole`/`requireRoleAny`), nunca `useEffect`.
- **`routeTree.gen.ts`:** gerado pelo plugin Vite; commitar quando muda; não editar à mão; se subir `npm run dev` em background, **matar o PID explicitamente** (não deixar órfão regenerando).
- **Subset latin do IBM Plex:** `@fontsource/ibm-plex-sans/latin-400.css` etc., nunca o import default.
- **lucide-react ^1.14:** já instalado; ícones do handoff (`Inbox`, `Ticket`, `Plus`, `Download`, `Search`, `Filter`, `Send`, `CheckCircle2`, `Shield`, `X`) são lucide.

---

## Master roadmap

| Slice | Tema                                               | Tamanho | Branch                             | Status    |
| ----- | -------------------------------------------------- | ------- | ---------------------------------- | --------- |
| 6.1   | Inbox header — botão Aprovações                    | XS      | `feature/plan-6-1-inbox-header`    | Detalhada |
| 6.2   | Tickets page (table/cards/kanban)                  | L       | `feature/plan-6-2-tickets-page`    | Detalhada |
| 6.2.1 | "Novo chamado" dialog (`POST /tickets`)            | S       | `feature/plan-6-2-1-ticket-create` | Roadmap   |
| 6.3   | Overview `/` index (KPIs + condo grid + atividade) | M       | `feature/plan-6-3-overview`        | Roadmap   |
| 6.4   | Approvals page (lista PENDING)                     | M       | `feature/plan-6-4-approvals`       | Roadmap   |
| 6.5   | Ticket detail page (timeline + composer)           | M-L     | `feature/plan-6-5-ticket-detail`   | Roadmap   |
| 6.6   | CRUD estrutura (Blocos/Unidades/Áreas)             | L       | `feature/plan-6-6-structure-crud`  | Roadmap   |

Após cada slice mergeada em `develop`, atualizar a **seção "Estado atual do projeto"** do `CLAUDE.md` e adicionar uma seção "Lições" se houver convenção nova descoberta no review (padrão de Plans 2–5).

---

## File structure (visão consolidada — todas as slices)

```
src/
├── features/
│   ├── activity/
│   │   ├── ActivityFeed.tsx                    # MODIFICAR (Slice 6.1)
│   │   ├── ActivityFeed.test.tsx               # MODIFICAR (Slice 6.1)
│   │   └── ActivityFeed.module.css             # MODIFICAR (Slice 6.1)
│   ├── tickets/                                # NOVO (Slice 6.2)
│   │   ├── TicketsPage.tsx
│   │   ├── TicketsPage.test.tsx
│   │   ├── TicketsPage.module.css
│   │   ├── TicketsFilters.tsx                  # search + status-seg + priority-select + view-toggle
│   │   ├── TicketsFilters.test.tsx
│   │   ├── TicketsFilters.module.css
│   │   ├── TicketsTable.tsx                    # adapta InboxTable antigo
│   │   ├── TicketsTable.module.css
│   │   ├── TicketsCards.tsx                    # adapta TicketCards antigo
│   │   ├── TicketsCards.module.css
│   │   ├── TicketsKanban.tsx                   # NOVO componente
│   │   ├── TicketsKanban.test.tsx
│   │   ├── TicketsKanban.module.css
│   │   ├── useTickets.ts                       # adapta useInboxTickets antigo
│   │   ├── useTickets.test.tsx
│   │   ├── filterTickets.ts                    # MOVER de features/inbox/
│   │   ├── filterTickets.test.ts               # MOVER
│   │   ├── useExportTickets.ts                 # chama GET /tickets/export
│   │   ├── useExportTickets.test.tsx
│   │   ├── viewModeStore.ts                    # Zustand persistido p/ table|cards|kanban
│   │   └── viewModeStore.test.ts
│   ├── overview/                               # NOVO (Slice 6.3)
│   ├── approvals/                              # NOVO (Slice 6.4)
│   ├── ticket-detail/                          # NOVO (Slice 6.5) — substitui modal
│   └── structure/                              # NOVO (Slice 6.6)
├── app/routes/_app/
│   ├── c/$condoId/
│   │   ├── tickets.tsx                         # MODIFICAR (Slice 6.2) — sai EmptyState, entra TicketsPage
│   │   └── ...
│   └── index.tsx                               # MODIFICAR (Slice 6.3) — sai redirect, entra OverviewPage
```

A pasta `src/features/inbox/` é **dead code** desde Plan 5 (nenhuma rota usa). Slice 6.2 move o que for reaproveitável para `src/features/tickets/` e deleta o resto.

---

## Slice 6.1 — Inbox header (botão "Ver aprovações pendentes")

**Branch:** `feature/plan-6-1-inbox-header`

**Escopo:** o handoff (`page-inbox.jsx:46–55`) tem duas ações no header da Inbox: `Marcar tudo como lido` (já temos) e `Ver aprovações pendentes` (falta). Adicionar o segundo botão como `Button` secundário (não-primary, pois "Marcar tudo como lido" é a ação principal do contexto), navegando para `/approvals` (cross-condo). Garantir que o botão fica escondido quando o user não pode ver `/approvals` (mesma regra da Sidebar — `requireRoleAny("manager")` em algum condo).

**Por que XS:** uma adição de botão + navegação + role gate + atualização de teste do `ActivityFeed`. ~50 linhas de produção, ~30 de teste.

### Task 1: Hook `useCanApprove` (deriva permissão cross-condo)

**Files:**

- Create: `src/features/auth/useCanApprove.ts`
- Test: `src/features/auth/useCanApprove.test.tsx`

**Contexto:** já temos `useMyCondos` (Plan 3) que devolve `{ condoId, role }[]`. A regra de "pode ver aprovações" é a mesma usada na Sidebar (`canApprovals` em `src/ui/AppShell/Sidebar/Sidebar.tsx:23`): `manager+` em algum condo (scope all) ou `manager+` no condo ativo (scope condo). Esta task extrai pra um hook reutilizável.

- [ ] **Step 1: Escrever o teste falhando**

```tsx
// src/features/auth/useCanApprove.test.tsx
import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useCanApprove } from "./useCanApprove";

const { mockMyCondos } = vi.hoisted(() => ({ mockMyCondos: vi.fn() }));
vi.mock("@/features/condo/useMyCondos", () => ({ useMyCondos: mockMyCondos }));

describe("useCanApprove", () => {
  it("scope condo: true quando role no condo é manager", () => {
    mockMyCondos.mockReturnValue({
      data: [
        { condoId: "c1", role: "manager" },
        { condoId: "c2", role: "viewer" },
      ],
    });
    const { result } = renderHook(() => useCanApprove({ kind: "condo", condoId: "c1" }));
    expect(result.current).toBe(true);
  });

  it("scope condo: false quando role no condo é viewer", () => {
    mockMyCondos.mockReturnValue({
      data: [{ condoId: "c1", role: "viewer" }],
    });
    const { result } = renderHook(() => useCanApprove({ kind: "condo", condoId: "c1" }));
    expect(result.current).toBe(false);
  });

  it("scope all: true quando manager em ao menos um condo", () => {
    mockMyCondos.mockReturnValue({
      data: [
        { condoId: "c1", role: "viewer" },
        { condoId: "c2", role: "manager" },
      ],
    });
    const { result } = renderHook(() => useCanApprove({ kind: "all" }));
    expect(result.current).toBe(true);
  });

  it("scope all: false quando nenhum condo tem manager+", () => {
    mockMyCondos.mockReturnValue({
      data: [{ condoId: "c1", role: "viewer" }],
    });
    const { result } = renderHook(() => useCanApprove({ kind: "all" }));
    expect(result.current).toBe(false);
  });

  it("retorna false enquanto isPending", () => {
    mockMyCondos.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useCanApprove({ kind: "all" }));
    expect(result.current).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/auth/useCanApprove.test.tsx`
Expected: FAIL com "Cannot find module './useCanApprove'".

- [ ] **Step 3: Implementar `useCanApprove`**

```ts
// src/features/auth/useCanApprove.ts
import { useMyCondos } from "@/features/condo/useMyCondos";
import { isAtLeast } from "@/features/condo/roleHierarchy";
import type { Scope } from "@/features/scope/useScope";

export function useCanApprove(scope: Scope): boolean {
  const { data } = useMyCondos();
  if (!data) return false;
  if (scope.kind === "condo") {
    const c = data.find((d) => d.condoId === scope.condoId);
    return c !== undefined && isAtLeast(c.role, "manager");
  }
  return data.some((d) => isAtLeast(d.role, "manager"));
}
```

- [ ] **Step 4: Rodar o teste, ver passar**

Run: `npx vitest run src/features/auth/useCanApprove.test.tsx`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/useCanApprove.ts src/features/auth/useCanApprove.test.tsx
git commit -m "feat(plan-6-1): hook useCanApprove deriva permissão cross-condo"
```

### Task 2: Adicionar botão "Ver aprovações pendentes" no ActivityFeed

**Files:**

- Modify: `src/features/activity/ActivityFeed.tsx`
- Modify: `src/features/activity/ActivityFeed.test.tsx`
- Modify: `src/features/activity/ActivityFeed.module.css` (se a row de actions precisar gap maior)

**Contexto:** o `ActivityFeed` já tem `<Header subtitle="X não lidos" actions={<Button>Marcar tudo como lido</Button>}>`. A `actions` precisa virar uma row com dois botões; o segundo só aparece se `useCanApprove(scope) === true`. Navegação:

- `scope.kind === "condo"` → `/c/$condoId/approvals` (rota per-condo existe em `_app/c/$condoId/approvals.tsx`)
- `scope.kind === "all"` → `/approvals` (rota cross-condo existe em `_app/approvals.tsx`)

- [ ] **Step 1: Atualizar o teste do header**

Localizar o teste atual que verifica "Marcar tudo como lido". Adicionar dois casos novos.

```tsx
// trecho a adicionar em src/features/activity/ActivityFeed.test.tsx
import userEvent from "@testing-library/user-event";

// ... no topo dos mocks, junto com mockMyCondos
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, useNavigate: () => mockNavigate, useSearch: () => ({}) };
});

it("exibe 'Ver aprovações pendentes' quando user é manager+", async () => {
  mockMyCondos.mockReturnValue({ data: [{ condoId: "c1", role: "manager" }] });
  // ... render ActivityFeed scope={{ kind: "condo", condoId: "c1" }}
  expect(
    await screen.findByRole("button", { name: /ver aprovações pendentes/i }),
  ).toBeInTheDocument();
});

it("não exibe 'Ver aprovações pendentes' quando user é viewer", async () => {
  mockMyCondos.mockReturnValue({ data: [{ condoId: "c1", role: "viewer" }] });
  // ... render ActivityFeed scope={{ kind: "condo", condoId: "c1" }}
  await waitForLoad();
  expect(
    screen.queryByRole("button", { name: /ver aprovações pendentes/i }),
  ).not.toBeInTheDocument();
});

it("navega para /c/$condoId/approvals em scope condo", async () => {
  mockMyCondos.mockReturnValue({ data: [{ condoId: "c1", role: "manager" }] });
  // ... render ActivityFeed scope={{ kind: "condo", condoId: "c1" }}
  await userEvent.click(await screen.findByRole("button", { name: /ver aprovações pendentes/i }));
  expect(mockNavigate).toHaveBeenCalledWith(
    expect.objectContaining({
      to: "/c/$condoId/approvals",
      params: { condoId: "c1" },
    }),
  );
});

it("navega para /approvals em scope all", async () => {
  mockMyCondos.mockReturnValue({ data: [{ condoId: "c1", role: "manager" }] });
  // ... render ActivityFeed scope={{ kind: "all" }}
  await userEvent.click(await screen.findByRole("button", { name: /ver aprovações pendentes/i }));
  expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/approvals" }));
});
```

(Reaproveitar setup de mock de repository que já existe no teste atual.)

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/activity/ActivityFeed.test.tsx`
Expected: FAIL nos 4 casos novos.

- [ ] **Step 3: Implementar o botão e a navegação**

```tsx
// src/features/activity/ActivityFeed.tsx — trecho que muda

import { useCanApprove } from "@/features/auth/useCanApprove";
import { Shield } from "lucide-react";

export function ActivityFeed({ scope }: Props) {
  const navigate = useNavigate();
  // ... resto igual
  const canApprove = useCanApprove(scope);

  function handleSeeApprovals() {
    if (scope.kind === "condo") {
      void navigate({ to: "/c/$condoId/approvals", params: { condoId: scope.condoId } });
    } else {
      void navigate({ to: "/approvals" } as unknown as Parameters<typeof navigate>[0]);
    }
  }

  // ... no return, substituir o actions atual:
  return (
    <>
      <Header
        subtitle={`${data.counts.unread} não lidos`}
        actions={
          <div className={styles.actionsRow}>
            <Button
              variant="secondary"
              onClick={() => {
                void markAllRead(scope);
              }}
            >
              Marcar tudo como lido
            </Button>
            {canApprove ? (
              <Button onClick={handleSeeApprovals}>
                <Shield aria-hidden="true" size={14} />
                Ver aprovações pendentes
              </Button>
            ) : null}
          </div>
        }
      />
      {/* ... resto igual */}
    </>
  );
}
```

(Conferir variants reais do `<Button>` em `src/ui/Button/Button.tsx` — se a API atual não tem `variant="secondary"`, ajustar; o handoff usa `btn secondary` para "Marcar tudo" e `btn primary` para "Ver aprovações".)

- [ ] **Step 4: Atualizar o CSS Module**

```css
/* src/features/activity/ActivityFeed.module.css — adicionar/atualizar */
.actionsRow {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
```

- [ ] **Step 5: Rodar todos os testes do feature**

Run: `npx vitest run src/features/activity`
Expected: all passed.

- [ ] **Step 6: Smoke manual**

```bash
npm run dev
```

Navegar em `/inbox` e `/c/<id>/inbox`:

1. Login como manager → 2 botões aparecem.
2. Click "Ver aprovações pendentes" em `/c/<id>/inbox` → navega para `/c/<id>/approvals`.
3. Click em `/inbox` → navega para `/approvals`.
4. Login como viewer → só "Marcar tudo como lido".

Matar o dev: `kill $PID`.

- [ ] **Step 7: Commit**

```bash
git add src/features/activity/ActivityFeed.tsx src/features/activity/ActivityFeed.test.tsx src/features/activity/ActivityFeed.module.css
git commit -m "feat(plan-6-1): botão 'Ver aprovações pendentes' no ActivityFeed"
```

### Task 3: Subtítulo "X items não lidos" (alinhar copy ao handoff)

**Files:**

- Modify: `src/features/activity/ActivityFeed.tsx:80`
- Modify: `src/features/activity/ActivityFeed.test.tsx`

**Contexto:** hoje o subtítulo é `${data.counts.unread} não lidos`. O handoff é `X item(s) não lido(s)` com pluralização e a palavra "item" explícita (`page-inbox.jsx:40–44`).

- [ ] **Step 1: Helper de pluralização + teste**

```ts
// src/features/activity/unreadCopy.ts
export function unreadCopy(n: number): string {
  if (n === 0) return "Tudo em dia — nenhum item não lido";
  return `${n} item${n > 1 ? "s" : ""} não lido${n > 1 ? "s" : ""}`;
}
```

```ts
// src/features/activity/unreadCopy.test.ts
import { describe, it, expect } from "vitest";
import { unreadCopy } from "./unreadCopy";

describe("unreadCopy", () => {
  it("0 → 'Tudo em dia'", () => {
    expect(unreadCopy(0)).toBe("Tudo em dia — nenhum item não lido");
  });
  it("1 → singular", () => {
    expect(unreadCopy(1)).toBe("1 item não lido");
  });
  it("2 → plural", () => {
    expect(unreadCopy(2)).toBe("2 items não lidos");
  });
});
```

- [ ] **Step 2: Rodar o teste, ver passar**

Run: `npx vitest run src/features/activity/unreadCopy.test.ts`
Expected: 3 passed.

- [ ] **Step 3: Usar no ActivityFeed**

```tsx
import { unreadCopy } from "./unreadCopy";
// ...
<Header subtitle={unreadCopy(data.counts.unread)} actions={/* ... */} />;
```

Atualizar testes de `ActivityFeed.test.tsx` que asseguravam o texto antigo.

- [ ] **Step 4: Rodar testes**

Run: `npx vitest run src/features/activity`
Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add src/features/activity/unreadCopy.ts src/features/activity/unreadCopy.test.ts src/features/activity/ActivityFeed.tsx src/features/activity/ActivityFeed.test.tsx
git commit -m "feat(plan-6-1): subtítulo plural 'X items não lidos'"
```

### Task 4: Verificação final e PR

- [ ] **Step 1: Lint + typecheck + testes + build**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: all green.

- [ ] **Step 2: Storybook (smoke)**

Run: `npm run storybook` (background) — abrir story do `ActivityFeed` se existir; confirmar visual. `kill $PID` ao fim.

- [ ] **Step 3: Push + abrir PR (skill `pr`)**

```bash
git push -u origin feature/plan-6-1-inbox-header
```

PR body checklist:

- [ ] Lint/typecheck/test/build verdes localmente.
- [ ] Smoke: 2 botões em scope condo (manager), 1 em viewer, navegação ok cross-condo e per-condo.
- [ ] Subtítulo "X items não lidos" com pluralização.
- [ ] Hook `useCanApprove` reutilizável para Slice 6.4 (Approvals page).
- [ ] Dead code: nenhum.

---

## Slice 6.2 — Tickets page (table / cards / kanban)

**Branch:** `feature/plan-6-2-tickets-page`

**Escopo:** trocar o `EmptyState "Em breve. Plan 5"` em `_app/c/$condoId/tickets.tsx` pela `TicketsPage` completa: header com ações `Exportar CSV` + `Novo chamado`, filter bar com search + status segmented + priority select + view-toggle, e 3 layouts (Tabela, Cards, Kanban). Reaproveitar `useInboxTickets` / `TicketTable` / `TicketCards` do `features/inbox/` (dead code desde Plan 5) movendo para `features/tickets/`. Kanban é componente novo.

**`Novo chamado`:** `POST /tickets` existe no Core (`RequireRole(RoleManager, RoleStaff)` — router linha 92). Nesta slice o botão **roteia para `/c/$condoId/tickets/new`** com placeholder `EmptyState`; o dialog real (form com title/description/priority/location/resident) é uma slice futura própria (6.2.1) para não inflar este PR. Botão **escondido** para roles abaixo de staff.

**`Exportar CSV`:** server-side via `GET /tickets/export` (`RequireRole(RoleManager)` — manager-only, linha 130 do router). Endpoint recebe `?created_from=YYYY-MM-DD&created_to=YYYY-MM-DD`, devolve `text/csv` com filename `tickets-YYYY-MM-DD.csv` e tem cap de 10k linhas (passa do cap → 400 com mensagem para estreitar o período). Botão **escondido** para roles abaixo de manager.

**`view-toggle persistido`:** salvar `tableMode | cardsMode | kanbanMode` em Zustand persistido (`zivy-tickets-view`) — UX igual à do storybook do handoff (volta no mesmo modo após reload).

### Task 1: Limpeza — mover `features/inbox/` reaproveitável para `features/tickets/`

**Files:**

- Move: `src/features/inbox/filterTickets.ts` → `src/features/tickets/filterTickets.ts`
- Move: `src/features/inbox/filterTickets.test.ts` → `src/features/tickets/filterTickets.test.ts`
- Move: `src/features/inbox/useInboxTickets.ts` → `src/features/tickets/useTickets.ts` (renomear `useInboxTickets` → `useTickets`)
- Move: `src/features/inbox/useInboxTickets.test.tsx` → `src/features/tickets/useTickets.test.tsx`
- Move: `src/features/inbox/types.ts` → `src/features/tickets/types.ts`
- Move: `src/features/inbox/TicketTable.tsx` → `src/features/tickets/TicketsTable.tsx` (renomear)
- Move: `src/features/inbox/TicketTable.module.css` → `src/features/tickets/TicketsTable.module.css`
- Move: `src/features/inbox/TicketCards.tsx` → `src/features/tickets/TicketsCards.tsx`
- Move: `src/features/inbox/TicketCards.module.css` → `src/features/tickets/TicketsCards.module.css`
- Move: `src/features/inbox/formatRelTime.ts` → `src/features/tickets/formatRelTime.ts` (também usado por `features/activity/`; ver Step 2 abaixo)
- Move: `src/features/inbox/formatRelTime.test.ts` → `src/features/tickets/formatRelTime.test.ts`
- Delete: `src/features/inbox/InboxPage.tsx`, `InboxPage.test.tsx`, `InboxPage.module.css`, `InboxFilters.*`, `InboxList.tsx` (substituídos)
- Manter (Slice 6.5): `src/features/inbox/TicketDetailModal.*`, `useTicket.*` (rota `inbox/$ticketId` ainda usa)

**Nota sobre o diretório `features/inbox/`:** após esta Slice, `features/inbox/` continua existindo só hospedando `TicketDetailModal.*` + `useTicket.*` enquanto a rota `inbox/$ticketId` (Plan 4) não for substituída pela page-level em `tickets/$ticketId` na Slice 6.5. Ou seja, **o rename "definitivo" só completa ao fim da 6.5**, quando o modal Plan-4 sai e o diretório pode ser removido. Aceitar essa coabitação curta para não inflar a 6.2 com a migração do detail.

**Decisão antes de começar:** `formatRelTime` é usado por `features/activity/ActivityItem.tsx` também. Melhor sair de `features/inbox/` para um local neutro. **Mover para `src/lib/formatRelTime.ts`** e atualizar imports.

- [ ] **Step 1: Inventariar imports atuais**

```bash
grep -rn "from \"@/features/inbox/" src tests 2>&1 || true
grep -rn "from \"./InboxPage\\|InboxList\\|InboxFilters\\|TicketTable\\|TicketCards" src 2>&1 || true
```

Listar callers — todos serão atualizados.

- [ ] **Step 2: Mover `formatRelTime` para `src/lib/`**

```bash
git mv src/features/inbox/formatRelTime.ts src/lib/formatRelTime.ts
git mv src/features/inbox/formatRelTime.test.ts src/lib/formatRelTime.test.ts
```

Atualizar imports em `src/features/activity/ActivityItem.tsx` (e em qualquer outro caller).

- [ ] **Step 3: Mover demais arquivos via `git mv`**

```bash
mkdir -p src/features/tickets
git mv src/features/inbox/filterTickets.ts src/features/tickets/filterTickets.ts
git mv src/features/inbox/filterTickets.test.ts src/features/tickets/filterTickets.test.ts
git mv src/features/inbox/types.ts src/features/tickets/types.ts
git mv src/features/inbox/TicketTable.tsx src/features/tickets/TicketsTable.tsx
git mv src/features/inbox/TicketTable.module.css src/features/tickets/TicketsTable.module.css
git mv src/features/inbox/TicketCards.tsx src/features/tickets/TicketsCards.tsx
git mv src/features/inbox/TicketCards.module.css src/features/tickets/TicketsCards.module.css
git mv src/features/inbox/useInboxTickets.ts src/features/tickets/useTickets.ts
git mv src/features/inbox/useInboxTickets.test.tsx src/features/tickets/useTickets.test.tsx
```

- [ ] **Step 4: Renomear `useInboxTickets` → `useTickets`, `TicketTable` → `TicketsTable`, `TicketCards` → `TicketsCards` nos arquivos movidos**

Edits diretos via `Edit` tool. Conferir que os testes referem o novo nome.

- [ ] **Step 5: Deletar dead code**

```bash
git rm src/features/inbox/InboxPage.tsx src/features/inbox/InboxPage.test.tsx src/features/inbox/InboxPage.module.css src/features/inbox/InboxFilters.tsx src/features/inbox/InboxFilters.test.tsx src/features/inbox/InboxFilters.module.css src/features/inbox/InboxList.tsx src/features/inbox/InboxList.module.css
```

Conferir: `git status` mostra `src/features/inbox/` só com `TicketDetailModal.*`, `useTicket.*` (e seus testes).

- [ ] **Step 6: Rodar testes e typecheck**

Run: `npm run typecheck && npx vitest run`
Expected: passar — imports de `formatRelTime` em `ActivityItem` ficaram corretos, e os arquivos movidos compilam.

- [ ] **Step 7: Commit**

```bash
git add -A src/features/inbox src/features/tickets src/lib
git commit -m "refactor(plan-6-2): mover dead-code Plan 4 (inbox/) para tickets/, formatRelTime → lib/"
```

### Task 2: Store de view mode persistido

**Files:**

- Create: `src/features/tickets/viewModeStore.ts`
- Create: `src/features/tickets/viewModeStore.test.ts`

**Contexto:** padrão idêntico ao `theme.ts` (Plan 2). Zustand + persist + `safeStorage()`. Key: `zivy-tickets-view`. Valores: `"table" | "cards" | "kanban"`. Default: `"table"`.

- [ ] **Step 1: Teste falhando**

```ts
// src/features/tickets/viewModeStore.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useTicketsView } from "./viewModeStore";

describe("useTicketsView", () => {
  beforeEach(() => {
    try {
      localStorage.removeItem("zivy-tickets-view");
    } catch {
      /* noop */
    }
    useTicketsView.setState({ mode: "table" });
  });

  it("default = 'table'", () => {
    expect(useTicketsView.getState().mode).toBe("table");
  });

  it("setMode persiste em localStorage", () => {
    useTicketsView.getState().setMode("kanban");
    expect(useTicketsView.getState().mode).toBe("kanban");
    expect(localStorage.getItem("zivy-tickets-view")).toContain("kanban");
  });

  it("hidrata de localStorage no boot", () => {
    localStorage.setItem("zivy-tickets-view", JSON.stringify({ state: { mode: "cards" } }));
    // re-import força reidratação — testar via dynamic import nesta versão
    // (ver implementação do theme.ts; aplicar mesmo padrão)
  });
});
```

- [ ] **Step 2: Implementar store**

```ts
// src/features/tickets/viewModeStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeStorage } from "@/stores/theme"; // se safeStorage não estiver exportado, criar src/lib/safeStorage.ts conforme convenção do CLAUDE.md

export type ViewMode = "table" | "cards" | "kanban";

interface ViewModeState {
  mode: ViewMode;
  setMode: (m: ViewMode) => void;
}

export const useTicketsView = create<ViewModeState>()(
  persist(
    (set) => ({
      mode: "table",
      setMode: (mode) => set({ mode }),
    }),
    {
      name: "zivy-tickets-view",
      storage: createJSONStorage(() => safeStorage()),
    },
  ),
);
```

- [ ] **Step 3: Rodar testes**

Run: `npx vitest run src/features/tickets/viewModeStore.test.ts`
Expected: 2-3 passed (ajustar caso 3 ao padrão real do `theme.test.ts`).

- [ ] **Step 4: Commit**

```bash
git add src/features/tickets/viewModeStore.ts src/features/tickets/viewModeStore.test.ts
git commit -m "feat(plan-6-2): viewModeStore persiste table|cards|kanban"
```

### Task 3: `useExportTickets` (chama `GET /tickets/export`)

**Files:**

- Create: `src/features/tickets/useExportTickets.ts`
- Create: `src/features/tickets/useExportTickets.test.tsx`

**Contexto:** o Core expõe `GET /tickets/export` (manager-only, router linha 130). Endpoint:

- Auth: Bearer + `X-Condo-ID`.
- Query params opcionais: `created_from=YYYY-MM-DD`, `created_to=YYYY-MM-DD` (datas inclusive em UTC).
- Resposta: `text/csv; charset=utf-8` com filename sugerido `tickets-YYYY-MM-DD.csv` no `Content-Disposition`.
- Cap: 10000 linhas → 400 com mensagem se exceder (pedir período).

A primeira versão **não expõe período** (botão simples). Se o usuário receber 400 com mensagem de cap, mostrar toast/alert com a instrução. Filtro de período é follow-up.

`openapi-fetch` retorna `Response` cru para non-JSON. Vamos contornar usando `fetch` direto autenticado — `openapi-fetch` é otimizado pra JSON e tipos de `paths`, não pra streaming de CSV.

**Pré-requisito: criar `src/api/authedFetch.ts`.** Hoje `src/api/client.ts` exporta apenas `api` (instância `openapi-fetch`) e `configureApiAuth(opts)` — não há helper público de headers/baseUrl reutilizável para `fetch` cru. O hook **não pode** ler `import.meta.env` direto (regra do `CLAUDE.md`) nem duplicar a lógica de Supabase do `applyAuthHeaders`. Solução: introduzir `src/api/authedFetch.ts` como um Step 0 desta task (ver Pré-requisito após Step 2), que reaproveita os mesmos `AuthGetters` configurados em `configureApiAuth` (extraindo o módulo `auth.ts` para exportar também os getters/baseUrl, sem mexer no `client.ts`). Assim, `useExportTickets` consome o helper, `openapi-fetch` continua sendo a via única para JSON, e não há regressão.

- [ ] **Step 1: Teste falhando**

```tsx
// src/features/tickets/useExportTickets.test.tsx
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useExportTickets } from "./useExportTickets";

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.mock("@/api/authedFetch", () => ({ authedFetch: mockFetch }));

const createObjectURL = vi.fn(() => "blob:fake");
const revokeObjectURL = vi.fn();

beforeEach(() => {
  vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
  document.body.innerHTML = "";
  mockFetch.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useExportTickets", () => {
  it("baixa CSV em sucesso", async () => {
    const blob = new Blob(["a,b\n1,2"], { type: "text/csv" });
    mockFetch.mockResolvedValue(
      new Response(blob, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="tickets-2026-05-17.csv"',
        },
      }),
    );
    const { result } = renderHook(() => useExportTickets("c1"));
    await act(async () => {
      await result.current.exportTickets();
    });
    expect(mockFetch).toHaveBeenCalledWith("/tickets/export", { condoId: "c1" });
    expect(createObjectURL).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it("propaga erro quando 400 (cap de linhas)", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: "export exceeds maximum of 10000 rows" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { result } = renderHook(() => useExportTickets("c1"));
    await act(async () => {
      await result.current.exportTickets();
    });
    await waitFor(() => expect(result.current.error).toMatch(/10000/));
  });
});
```

- [ ] **Step 2: Implementar**

```ts
// src/features/tickets/useExportTickets.ts
import { useState } from "react";
import { authedFetch } from "@/api/authedFetch";

interface Result {
  exportTickets: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useExportTickets(condoId: string): Result {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportTickets() {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch("/tickets/export", { condoId });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? `Falha ao exportar (HTTP ${res.status})`);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(cd);
      const filename = match?.[1] ?? `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return { exportTickets, isLoading, error };
}
```

**Pré-requisito:** existência de `src/api/authedFetch.ts` — helper que aplica Bearer + `X-Condo-ID` em um `fetch` cru (devolve `Response`). Se não existir, criar nele mesmo passo: ler `getSession()` (auth bridge do Plan 2) + montar headers. **Decisão:** criar `src/api/authedFetch.ts` como Step 0 desta task se ainda não existir; manter `src/api/client.ts` (openapi-fetch) intacto.

- [ ] **Step 3: Rodar testes**

Run: `npx vitest run src/features/tickets/useExportTickets.test.tsx`
Expected: passed.

- [ ] **Step 4: Commit**

```bash
git add src/features/tickets/useExportTickets.ts src/features/tickets/useExportTickets.test.tsx src/api/authedFetch.ts
git commit -m "feat(plan-6-2): useExportTickets chama GET /tickets/export (server-side CSV)"
```

### Task 4: `TicketsFilters` (search + status seg + priority select + view toggle)

**Files:**

- Create: `src/features/tickets/TicketsFilters.tsx`
- Create: `src/features/tickets/TicketsFilters.test.tsx`
- Create: `src/features/tickets/TicketsFilters.module.css`

**Contexto:** baseado em `InboxFilters` antigo (search + status seg + priority select), mas adiciona à direita o segmented Tabela/Cards/Kanban consumindo `useTicketsView`. Layout do handoff: filter bar única, search flexível à esquerda, status seg no meio, priority select compacto, view-toggle à direita com `marginLeft: auto`. Veja `page-tickets.jsx:54–86`.

Estado controlado pelo pai: `{ search, status, priority }`. Counts vêm via prop (`{ all, open, in_progress, resolved, closed }`). Acessibilidade: cada seg = tablist, igual ao padrão fixado no Plan 5 (`ActivityFeedTabs`).

- [ ] **Step 1: Teste falhando** — cobertura: render dos 4 grupos, click em status emite `onChange`, click em view-toggle escreve no store, counts aparecem nos labels.

(Modelo: `InboxFilters.test.tsx` antigo. Acrescentar caso "ao clicar 'Kanban' o store passa a kanban".)

- [ ] **Step 2: Implementar `TicketsFilters`** — JSX abaixo é um esqueleto; copiar o CSS do handoff em `TicketsFilters.module.css` mantendo nomes locais (`.filterBar`, `.search`, `.seg`).

```tsx
// src/features/tickets/TicketsFilters.tsx
import { Search } from "lucide-react";
import { useTicketsView, type ViewMode } from "./viewModeStore";
import styles from "./TicketsFilters.module.css";

export type Status = "all" | "open" | "in_progress" | "resolved" | "closed";
export type Priority = "all" | "urgent" | "high" | "medium" | "low";

interface Props {
  value: { search: string; status: Status; priority: Priority };
  counts: Record<Exclude<Status, "all">, number> & { all: number };
  onChange: (v: { search: string; status: Status; priority: Priority }) => void;
}

const STATUS_LABELS: Record<Status, string> = {
  all: "Todos",
  open: "Abertos",
  in_progress: "Em andamento",
  resolved: "Resolvidos",
  closed: "Fechados",
};
const PRIORITY_LABELS: Record<Priority, string> = {
  all: "Qualquer prioridade",
  urgent: "Urgente",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

export function TicketsFilters({ value, counts, onChange }: Props) {
  const mode = useTicketsView((s) => s.mode);
  const setMode = useTicketsView((s) => s.setMode);

  function setStatus(s: Status) {
    onChange({ ...value, status: s });
  }
  function setPriority(p: Priority) {
    onChange({ ...value, priority: p });
  }
  function setSearch(q: string) {
    onChange({ ...value, search: q });
  }

  return (
    <div className={styles.filterBar}>
      <label className={styles.search}>
        <Search aria-hidden="true" size={14} />
        <input
          type="text"
          placeholder="Buscar por título, protocolo, morador…"
          value={value.search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar chamados"
        />
      </label>

      <div className={styles.seg} role="tablist" aria-label="Filtrar por status">
        {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={value.status === s}
            className={value.status === s ? styles.segActive : ""}
            onClick={() => setStatus(s)}
          >
            {STATUS_LABELS[s]} ({s === "all" ? counts.all : counts[s]})
          </button>
        ))}
      </div>

      <select
        className={styles.priorityInput}
        value={value.priority}
        onChange={(e) => setPriority(e.target.value as Priority)}
        aria-label="Filtrar por prioridade"
      >
        {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABELS[p]}
          </option>
        ))}
      </select>

      <div
        className={`${styles.seg} ${styles.viewToggle}`}
        role="tablist"
        aria-label="Modo de visualização"
      >
        {(["table", "cards", "kanban"] as ViewMode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={mode === m ? styles.segActive : ""}
            onClick={() => setMode(m)}
          >
            {m === "table" ? "Tabela" : m === "cards" ? "Cards" : "Kanban"}
          </button>
        ))}
      </div>
    </div>
  );
}
```

CSS copia o bloco `.filter-bar`, `.filter-search`, `.seg`, `.seg button.active` do handoff `styles.css:514–528, 499–512`. View-toggle `marginLeft: auto` para empurrar à direita.

- [ ] **Step 3: Rodar testes**

Run: `npx vitest run src/features/tickets/TicketsFilters.test.tsx`
Expected: passed.

- [ ] **Step 4: Storybook story** (`TicketsFilters.stories.tsx`)

Default + um active state cada (status, priority, view). Reaproveitar pattern do `InboxFilters.stories.tsx` se existir.

- [ ] **Step 5: Commit**

```bash
git add src/features/tickets/TicketsFilters.*
git commit -m "feat(plan-6-2): TicketsFilters (search + status seg + priority + view toggle)"
```

### Task 5: `TicketsTable` e `TicketsCards` — ajustes ao novo layout

**Files:**

- Modify: `src/features/tickets/TicketsTable.tsx` (já movido em Task 1; ajustar nome de export, adicionar coluna `Atualizado` se faltar)
- Modify: `src/features/tickets/TicketsCards.tsx` (idem)

**Contexto:** os componentes vieram de `features/inbox/` (Plan 4). Verificar com `page-tickets.jsx:90–158` que colunas e células batem:

- **Tabela:** Protocolo, Chamado (título + cell-sub), Condomínio (apenas em scope `all`; primeiro PR é per-condo, então omitir agora), Status, Prioridade, Responsável, Atualizado.
- **Cards:** head (protocolo + status), título h4, descrição truncada 2 linhas, foot (prioridade + categoria · responsável + relTime).
- Urgência tem indicador vermelho à esquerda (border-left 3px em `.ticket-card.urgent` / `.k-card.urgent` + dot no início do título da tabela).

- [ ] **Step 1: Diff vs handoff e ajustar colunas/labels**

Comparar mentalmente cada cell com `page-tickets.jsx`. Aplicar pequenos ajustes (nomes de coluna, classe `cell-sub` etc.). Re-rodar testes herdados.

- [ ] **Step 2: Testes (smoke se vierem dos arquivos antigos)**

Run: `npx vitest run src/features/tickets/TicketsTable.test.tsx src/features/tickets/TicketsCards.test.tsx` (se existirem; se não, smoke é o suficiente — esses são apresentacionais).

- [ ] **Step 3: Commit**

```bash
git add src/features/tickets/TicketsTable.* src/features/tickets/TicketsCards.*
git commit -m "feat(plan-6-2): TicketsTable + TicketsCards alinhadas ao handoff"
```

### Task 6: `TicketsKanban` (novo)

**Files:**

- Create: `src/features/tickets/TicketsKanban.tsx`
- Create: `src/features/tickets/TicketsKanban.test.tsx`
- Create: `src/features/tickets/TicketsKanban.module.css`

**Contexto:** 4 colunas (`open | in_progress | resolved | closed`) lado a lado, cada uma com header (StatusBadge + count) e cards compactos com protocol + título + prio + responsável + relTime. Layout: `grid-template-columns: repeat(4, minmax(240px, 1fr))`. Empty col → texto "Nenhum chamado". Sem drag-and-drop nesse PR (visualização only — a mudança de status mora no Ticket detail, Slice 6.5). Veja `page-tickets.jsx:162–195`.

- [ ] **Step 1: Teste — agrupamento por status**

```tsx
// src/features/tickets/TicketsKanban.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TicketsKanban } from "./TicketsKanban";
import type { Ticket } from "./types";

const make = (s: Ticket["status"], id: string): Ticket => ({
  /* fixture mínima */
});

describe("TicketsKanban", () => {
  it("agrupa tickets por status nas 4 colunas", () => {
    const tickets = [
      make("open", "1"),
      make("open", "2"),
      make("in_progress", "3"),
      make("resolved", "4"),
    ];
    render(<TicketsKanban tickets={tickets} onPick={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /abertos/i }).parentElement).toHaveTextContent("2");
    expect(screen.getByText(/nenhum chamado/i)).toBeInTheDocument(); // coluna fechados
  });

  it("click no card chama onPick(id)", async () => {
    const onPick = vi.fn();
    render(<TicketsKanban tickets={[make("open", "1")]} onPick={onPick} />);
    await userEvent.click(screen.getByRole("article", { name: /TKT-/i }));
    expect(onPick).toHaveBeenCalledWith("1");
  });
});
```

- [ ] **Step 2: Implementar**

```tsx
// src/features/tickets/TicketsKanban.tsx
import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { PriorityChip } from "@/ui/PriorityChip/PriorityChip";
import { formatRelTime } from "@/lib/formatRelTime";
import type { Ticket, TicketStatus } from "./types";
import styles from "./TicketsKanban.module.css";

const COLUMNS: { id: TicketStatus; label: string }[] = [
  { id: "open", label: "Abertos" },
  { id: "in_progress", label: "Em andamento" },
  { id: "resolved", label: "Resolvidos" },
  { id: "closed", label: "Fechados" },
];

interface Props {
  tickets: Ticket[];
  onPick: (id: string) => void;
}

export function TicketsKanban({ tickets, onPick }: Props) {
  return (
    <div className={styles.kanban}>
      {COLUMNS.map((col) => {
        const items = tickets.filter((t) => t.status === col.id);
        return (
          <div key={col.id} className={styles.col}>
            <div className={styles.colHead}>
              <h3 className={styles.colTitle}>
                <StatusBadge status={col.id} />
              </h3>
              <span className={styles.colCount}>{items.length}</span>
            </div>
            {items.length === 0 ? (
              <p className={styles.empty}>Nenhum chamado</p>
            ) : (
              items.map((t) => (
                <article
                  key={t.id}
                  className={`${styles.card}${t.priority === "urgent" ? " " + styles.urgent : ""}`}
                  onClick={() => onPick(t.id)}
                  aria-label={t.protocol}
                  role="article"
                >
                  <div className={styles.proto}>{t.protocol}</div>
                  <h4 className={styles.title}>{t.title}</h4>
                  <div className={styles.meta}>
                    <PriorityChip level={t.priority} />
                    {t.assignedTo ? (
                      <span>{t.assignedTo.name.split(" ")[0]}</span>
                    ) : (
                      <span className={styles.muted}>sem resp.</span>
                    )}
                    <span className={styles.time}>{formatRelTime(t.updatedAt)}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
```

CSS copia `.kanban`, `.kanban-col`, `.kanban-col-head`, `.col-title`, `.col-count`, `.k-card`, `.k-card.urgent`, `.k-card .k-proto`, `.k-card .k-title`, `.k-card .k-meta` do handoff (`styles.css:577–601`).

- [ ] **Step 3: Rodar testes**

Run: `npx vitest run src/features/tickets/TicketsKanban.test.tsx`
Expected: passed.

- [ ] **Step 4: Storybook story**

Mostrar com fixture de 8 tickets distribuídos pelas 4 colunas.

- [ ] **Step 5: Commit**

```bash
git add src/features/tickets/TicketsKanban.*
git commit -m "feat(plan-6-2): TicketsKanban (4 colunas, view-only)"
```

### Task 7: `TicketsPage` (composição)

**Files:**

- Create: `src/features/tickets/TicketsPage.tsx`
- Create: `src/features/tickets/TicketsPage.test.tsx`
- Create: `src/features/tickets/TicketsPage.module.css`

**Contexto:** página completa que junta header (h1 "Tickets" + subtítulo "X chamados · ordenados por prioridade" + ações `Exportar CSV` + `Novo chamado`), `TicketsFilters`, e o layout escolhido via store. Sort: prioridade > updatedAt desc. Usa `useTickets(condoId)` (já movido).

- [ ] **Step 1: Teste**

Cobertura:

1. Renderiza `Tickets` h1 + subtítulo com count.
2. Renderiza `TicketsFilters` e o layout default (table).
3. Trocar `viewMode` mostra Cards/Kanban.
4. Click em `Exportar CSV` chama `downloadTicketsCSV` (mock).
5. Botão `Novo chamado` aparece para manager/staff (roteia para placeholder `/c/$id/tickets/new`); escondido para viewer.
6. Estado loading mostra `<Spinner>`.
7. Estado erro mostra retry.

(Mock `useTickets` via `vi.mock` + `vi.hoisted` — convenção do CLAUDE.md.)

- [ ] **Step 2: Implementar `TicketsPage`** — usar `useTicketsView` para escolher o layout; aplicar filtros + sort com `filterTickets` + comparator próprio.

```tsx
// src/features/tickets/TicketsPage.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Download, Plus } from "lucide-react";
import { Button } from "@/ui/Button/Button";
import { Spinner } from "@/ui/Spinner/Spinner";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import { useTickets } from "./useTickets";
import { useTicketsView } from "./viewModeStore";
import { filterTickets } from "./filterTickets";
import { useExportTickets } from "./useExportTickets";
import { useMyCondos } from "@/features/condo/useMyCondos";
import { isAtLeast } from "@/features/condo/roleHierarchy";
import { TicketsFilters, type Status, type Priority } from "./TicketsFilters";
import { TicketsTable } from "./TicketsTable";
import { TicketsCards } from "./TicketsCards";
import { TicketsKanban } from "./TicketsKanban";
import type { Ticket } from "./types";
import styles from "./TicketsPage.module.css";

const PRIO: Record<Ticket["priority"], number> = { urgent: 0, high: 1, medium: 2, low: 3 };

interface Props {
  condoId: string;
}

export function TicketsPage({ condoId }: Props) {
  const navigate = useNavigate();
  const { data, isPending, isError, refetch } = useTickets(condoId);
  const mode = useTicketsView((s) => s.mode);
  const { exportTickets, isLoading: isExporting, error: exportError } = useExportTickets(condoId);
  const myCondos = useMyCondos();
  const role = myCondos.data?.find((c) => c.condoId === condoId)?.role;
  const canExport = role !== undefined && isAtLeast(role, "manager");
  const canCreate = role !== undefined && isAtLeast(role, "staff");
  const [filters, setFilters] = useState<{ search: string; status: Status; priority: Priority }>({
    search: "",
    status: "all",
    priority: "all",
  });

  const sorted = useMemo(() => {
    const list = filterTickets(data ?? [], filters);
    return [...list].sort((a, b) => {
      const pd = PRIO[a.priority] - PRIO[b.priority];
      if (pd !== 0) return pd;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [data, filters]);

  const counts = useMemo(() => {
    const base = data ?? [];
    return {
      all: base.length,
      open: base.filter((t) => t.status === "open").length,
      in_progress: base.filter((t) => t.status === "in_progress").length,
      resolved: base.filter((t) => t.status === "resolved").length,
      closed: base.filter((t) => t.status === "closed").length,
    };
  }, [data]);

  function handlePick(id: string) {
    void navigate({ to: "/c/$condoId/tickets/$ticketId", params: { condoId, ticketId: id } });
  }

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1>Tickets</h1>
          <p className={styles.sub}>
            {sorted.length} chamado{sorted.length !== 1 ? "s" : ""} · ordenados por prioridade
          </p>
        </div>
        <div className={styles.actions}>
          {canExport ? (
            <Button
              variant="secondary"
              onClick={() => {
                void exportTickets();
              }}
              disabled={isExporting}
            >
              <Download size={14} /> {isExporting ? "Exportando…" : "Exportar CSV"}
            </Button>
          ) : null}
          {canCreate ? (
            <Button
              onClick={() => {
                void navigate({ to: "/c/$condoId/tickets/new", params: { condoId } });
              }}
            >
              <Plus size={14} /> Novo chamado
            </Button>
          ) : null}
        </div>
      </header>
      {exportError ? (
        <p role="alert" className={styles.error}>
          {exportError}
        </p>
      ) : null}

      {isPending ? <Spinner /> : null}
      {isError ? (
        <div className={styles.error}>
          <p>Não foi possível carregar os chamados.</p>
          <Button
            onClick={() => {
              void refetch();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}

      {data ? (
        <>
          <TicketsFilters value={filters} counts={counts} onChange={setFilters} />
          {sorted.length === 0 ? (
            <EmptyState
              title="Nada por aqui"
              description="Ajuste os filtros ou aguarde novos chamados."
            />
          ) : mode === "table" ? (
            <TicketsTable tickets={sorted} onPick={handlePick} />
          ) : mode === "cards" ? (
            <TicketsCards tickets={sorted} onPick={handlePick} />
          ) : (
            <TicketsKanban tickets={sorted} onPick={handlePick} />
          )}
        </>
      ) : null}
    </>
  );
}
```

CSS de `TicketsPage.module.css` copia `.page-header`, `.page-header h1`, `.page-sub` do handoff (`styles.css:485–500`).

- [ ] **Step 3: Rodar testes**

Run: `npx vitest run src/features/tickets/TicketsPage.test.tsx`
Expected: all passed.

- [ ] **Step 4: Commit**

```bash
git add src/features/tickets/TicketsPage.*
git commit -m "feat(plan-6-2): TicketsPage composição com 3 layouts e CSV export"
```

### Task 8: Plug na rota + rota filha para detail

**Files:**

- Modify: `src/app/routes/_app/c/$condoId/tickets.tsx`
- (Slice 6.5 adicionará `tickets/$ticketId.tsx`; por ora, criar a rota com `EmptyState "Em breve"` para que o `navigate({ to: "/c/$condoId/tickets/$ticketId" })` no `TicketsPage` não quebre TanStack Router em build/dev.)
- Create: `src/app/routes/_app/c/$condoId/tickets/$ticketId.tsx` (placeholder)

- [ ] **Step 1: Atualizar `tickets.tsx`**

```tsx
// src/app/routes/_app/c/$condoId/tickets.tsx
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TicketsPage } from "@/features/tickets/TicketsPage";
import { requireRole } from "@/lib/routeGuards";

export const Route = createFileRoute("/_app/c/$condoId/tickets")({
  beforeLoad: ({ params, context }) => requireRole({ params, context, min: "viewer" }),
  component: TicketsRoute,
});

function TicketsRoute() {
  const { condoId } = Route.useParams();
  return (
    <>
      <TicketsPage condoId={condoId} />
      <Outlet />
    </>
  );
}
```

- [ ] **Step 2: Criar placeholders das rotas filhas**

```tsx
// src/app/routes/_app/c/$condoId/tickets/$ticketId.tsx
import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/_app/c/$condoId/tickets/$ticketId")({
  component: () => (
    <EmptyState title="Detalhe do chamado" description="Tela completa chega na Slice 6.5." />
  ),
});
```

```tsx
// src/app/routes/_app/c/$condoId/tickets/new.tsx
import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/routeGuards";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/_app/c/$condoId/tickets/new")({
  beforeLoad: ({ params, context }) => requireRole({ params, context, min: "staff" }),
  component: () => (
    <EmptyState
      title="Novo chamado"
      description="Form completo (POST /tickets) chega na Slice 6.2.1."
    />
  ),
});
```

(Após `npm run dev`, o `routeTree.gen.ts` regenera. Matar PID. `git add` o gen file também.)

- [ ] **Step 3: Smoke manual**

```bash
npm run dev
```

Login → navegar para `/c/<id>/tickets`:

1. Lista renderiza, conta correta no subtítulo.
2. Filtros funcionam (search, status, prioridade).
3. View toggle troca entre Tabela/Cards/Kanban — recarregar a página mantém o modo escolhido.
4. Login como manager → click "Exportar CSV" → arquivo `tickets-YYYY-MM-DD.csv` baixa; abrir e validar.
5. Login como viewer → botão "Exportar CSV" não aparece.
6. Login como staff → "Novo chamado" aparece e roteia para `/c/<id>/tickets/new` placeholder.
7. Click numa linha → vai pra `/c/<id>/tickets/<ticketId>` placeholder.

Matar dev: `kill $PID`.

- [ ] **Step 4: Verificação final**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: all green.

- [ ] **Step 5: Commit + push + PR**

```bash
git add src/app/routes/_app/c/\$condoId/tickets.tsx src/app/routes/_app/c/\$condoId/tickets src/app/routeTree.gen.ts
git commit -m "feat(plan-6-2): plug TicketsPage em /c/\$condoId/tickets + placeholder detail"
git push -u origin feature/plan-6-2-tickets-page
```

PR body checklist:

- [ ] CI verde.
- [ ] Smoke local OK em 3 layouts + CSV.
- [ ] `useInboxTickets` / `InboxPage` antigos removidos (dead code).
- [ ] `formatRelTime` agora em `src/lib/`.
- [ ] Rotas `tickets/$ticketId` (→ 6.5) e `tickets/new` (→ 6.2.1) são placeholders.
- [ ] CSV via `GET /tickets/export` server-side (manager-only).
- [ ] Botão "Novo chamado" navega para placeholder; visível só para staff+.
- [ ] `routeTree.gen.ts` regenerado e commitado.

---

## Roadmap Appendix — Slices 6.3 a 6.6

Cada item abaixo é uma **slice spec**, não tasks executáveis. Será expandida para bite-sized tasks em um plan file próprio (`2026-XX-XX-plan-6-N-*.md`) quando entrar na fila — escrever steps detalhados agora corre risco alto de ficarem stale antes de executar (lição do Plan 5).

### Slice 6.3 — Overview page (`/` index)

**Branch:** `feature/plan-6-3-overview`

**Referência:** `docs/handoff/zivy-wa-green/project/src/page-overview.jsx` (153 linhas) + `styles.css:629–666`.

**Escopo:**

1. Trocar o redirect em `src/app/routes/_app/index.tsx` por uma `OverviewPage`.
2. Header: `h1` "Visão geral" (scope all) ou `<nome do condo>` (scope condo) + subtítulo + ações `Período` (placeholder) e `Ver chamados`.
3. KPI row (4 cards): Abertos / Em andamento / Resolvidos / Urgentes ativos — todos derivados de `useTickets({ scope })` (variante cross-condo do hook atual).
4. **Apenas em scope all:** seção "Condomínios" com grid de `CondoCard` (mark + nome + cidade + stats + barra de progresso). Click no card foca o scope (chama setter de `activeCondo` + redirect para `/c/<id>`).
5. Tabela "Atividade recente" (6 últimas mudanças) — pode consumir o `ActivityRepository` existente filtrado por `limit: 6`.

**File structure:**

```
src/features/overview/
├── OverviewPage.tsx + .test.tsx + .module.css
├── KpiRow.tsx + .module.css
├── CondoCard.tsx + .module.css + .stories.tsx
└── RecentActivityTable.tsx + .module.css
src/features/tickets/
└── useTicketsScoped.ts + .test.tsx     # variante cross-condo de useTickets (já existe per-condo)
```

**Acceptance:**

- Scope all: aparecem KPIs agregados, condo grid, atividade recente cross-condo.
- Scope condo: aparecem KPIs do condo, sem grid, atividade do condo.
- Click no condo card foca scope + navega para `/c/<id>/inbox`.
- Sem dados → cada bloco mostra zeros sem quebrar.
- Lint/typecheck/test/build verdes.

**Tamanho estimado:** ~600–800 linhas de bite-sized tasks. Médio.

### Slice 6.4 — Approvals page (lista PENDING)

**Branch:** `feature/plan-6-4-approvals`

**Referência:** `docs/handoff/zivy-wa-green/project/src/page-approvals.jsx` (140 linhas) + `.approval-card` em `styles.css:723–732`.

**Escopo:**

1. Substituir os placeholders em `src/app/routes/_app/approvals.tsx` (cross-condo) e `src/app/routes/_app/c/$condoId/approvals.tsx` (per-condo) pela `ApprovalsPage`.
2. Header: `h1` "Aprovações pendentes" + subtítulo explicativo (status `PENDING` + bot Telegram).
3. Card "Moradores PENDING" com banner informativo + lista de `ApprovalCard`s (avatar 2 chars, nome, unidade/bloco, condomínio, telefone mascarado, "Pendente há X", badge "Cadastrado via bot" se aplicável, ações `Rejeitar` (danger-ghost) + `Aprovar` (primary)).
4. Estados: lista vazia (com aprovados na sessão → confirmação verde; sem aprovados → "nenhuma aprovação pendente").
5. Confirm modal de rejeitar (Radix Dialog, mesmo padrão de Plan 4).

**Endpoints Core (todos existem em `develop`):**

- `GET /residents` — devolve todos os residents do condo ativo (sem filtro server-side). Filtrar `status === "PENDING"` client-side.
- `PATCH /residents/{id}/approve` — aprova (status → ACTIVE).
- `PATCH /residents/{id}/reject` — rejeita (status → INACTIVE). **PATCH, não DELETE.**

Sem repositório intermediário — TanStack Query + `openapi-fetch` direto (`src/api/client.ts`). YAGNI: o pattern de repository do Plan 5 fez sentido porque o endpoint não existia; aqui existe.

**File structure:**

```
src/features/approvals/
├── usePendingResidents.ts + .test.tsx       # GET /residents → filter PENDING
├── useApproveResident.ts + .test.tsx        # PATCH /residents/{id}/approve
├── useRejectResident.ts + .test.tsx         # PATCH /residents/{id}/reject
├── ApprovalsPage.tsx + .test.tsx + .module.css
├── ApprovalCard.tsx + .module.css + .stories.tsx
└── RejectConfirmDialog.tsx
```

**Acceptance:**

- Lista renderiza com avatar/meta/badge bot.
- Approve remove o item + acumula contador "X aprovados nesta sessão".
- Reject abre confirm; OK remove o item; Cancel mantém.
- Lista vazia mostra mensagens corretas em cada estado.
- Role gate: rota cross-condo `requireRoleAny("manager")`, per-condo `requireRole("manager")` — já aplicado em Plan 5.3, manter.
- Lint/typecheck/test/build verdes.

**Tamanho estimado:** ~500–700 linhas de bite-sized tasks. Médio.

**Atenção cross-condo:** `GET /residents` exige header `X-Condo-ID`. Para `/approvals` cross-condo, fan-out por condo (igual ao `HttpActivityRepository` do Plan 5.4) — `Promise.all` sobre `useMyCondos().data` e concat dos PENDING.

### Slice 6.5 — Ticket detail page (timeline + composer)

**Branch:** `feature/plan-6-5-ticket-detail`

**Referência:** `docs/handoff/zivy-wa-green/project/src/page-ticket-detail.jsx` (146 linhas) + `.timeline` (531) e `.composer` (561) em `styles.css`.

**Escopo:**

1. Trocar a rota `_app/c/$condoId/inbox/$ticketId` (modal Plan 4 — Radix Dialog) por uma rota page-level `_app/c/$condoId/tickets/$ticketId.tsx`. Manter `inbox/$ticketId` como **redirect via `beforeLoad: () => throw redirect({ to: "/c/$condoId/tickets/$ticketId", params, replace: true })`** (não `useEffect`, não componente que rerenderiza). Com `defaultPreload: "intent"`, isso evita disparar fetch da rota antiga ao hover. Antes da remoção definitiva (release seguinte), **migrar os deep-links externos**: bot Telegram (URLs de notificação enviadas aos moradores/managers), templates de email transacional, e qualquer integração que linke direto. Lista a verificar: `core/internal/adapters/notifier/*` (Telegram bot) + templates pendentes.
2. Header da página: protocolo + condo name + h2 (título) + close button (volta para `/c/<id>/tickets`). Linha de chips: StatusBadge + PriorityChip + categoria + localização. Metadata row: morador, contato (mono), aberto em (fullTime), atualizado (relTime).
3. Card "Mudar status" (segmented com 4 status; clica → mutation no Core) + botão **"Assumir ticket"** (atribui ao manager logado via `PATCH /tickets/{id}/assign` sem body — ver nota abaixo).
4. "Descrição" em bloco muted.
5. "Timeline" — lista de `TicketEvent[]` do Core (`status_changed | assigned | comment_added`), com dot temático por tipo, autor + ação + relTime + corpo (quando comment). Item `created` UI-only no topo derivado de `ticket.created_at`.
6. "Composer" — textarea + footer com botão "Publicar" (disabled quando vazio). **Sem aviso de "Telegram"**: `service.AddComment` (ver `core/internal/app/ticket_service.go:210`) apenas persiste o evento `comment_added`, não dispara `NotificationSender`. As notificações Telegram saem em `CreateTicket` (linha 116) e `Assign` (linha 205), não em comentários.

**Endpoints Core (todos existem em `develop`):**

- `GET /tickets/{id}` (já existe via `useTicket`).
- `GET /tickets/{id}/events` — devolve `TicketEvent[]` (router linha 138).
- `PATCH /tickets/{id}/status` — atualiza status (manager/staff), body `{ status }`.
- `PATCH /tickets/{id}/assign` — **auto-atribuição** (manager/staff). **Não aceita body** — o handler lê o manager autenticado (`MustUserFromContext`) e chama `service.Assign(ctx, condo, ticketID, user.UserID, user.UserID)` (ver `ticket_handler.go:399–422`). Path é `/assign`, não `/assignee`. **Limitação:** não é possível atribuir a outro manager nesta versão do Core. UI exposta como botão "Assumir ticket"; "Atribuir a outro manager" fica como follow-up dependente de um novo endpoint Core (ex.: `PATCH /tickets/{id}/assign-to` com body `{ assignee_id }`) — registrar issue no Core antes de iniciar esta Slice.
- `POST /tickets/{id}/comments` — adiciona comentário (manager/staff). Body é `{ text: string }` (campo `text`, **não** `note`). Devolve um `TicketEvent` com `event_type = "comment_added"` e `payload = { "text": "<texto>" }`.

**`TicketEventType` no Core:** `status_changed | assigned | comment_added` (constantes em `core/internal/domain/ticket_event.go:12-14`). **Não há evento `created`** — o handoff inventou esse tipo na UI. Convenção no front: derivar um item `created` UI-only a partir de `ticket.created_at` no topo da timeline. Ajustar o `Record<EventType, Meta>` da `TicketTimeline` para mapear `comment_added` (não `comment`). O corpo do comentário sai de `event.payload.text` (não `event.payload.note`).

**`TicketActorType`:** `manager | resident | system` (vem em `event.actor_type`; constantes em `core/internal/domain/ticket_event.go:20-22`). Usar pra escolher ícone/cor da dot da timeline.

**File structure:**

```
src/features/ticket-detail/
├── TicketDetailPage.tsx + .test.tsx + .module.css
├── TicketStatusControl.tsx + .test.tsx + .module.css
├── TicketClaimButton.tsx + .test.tsx + .module.css   # "Assumir ticket" (auto-atribuição, sem body)
├── TicketTimeline.tsx + .test.tsx + .module.css
├── TicketComposer.tsx + .test.tsx + .module.css
├── useTicketEvents.ts + .test.tsx
├── useUpdateStatus.ts + .test.tsx
├── useClaimTicket.ts + .test.tsx                     # PATCH /tickets/{id}/assign sem body
└── useAddComment.ts + .test.tsx                      # POST /tickets/{id}/comments body { text }
src/app/routes/_app/c/$condoId/
├── tickets/$ticketId.tsx              # substitui placeholder de Slice 6.2
└── inbox/$ticketId.tsx                # redirect para nova URL (transitório)
```

**Acceptance:**

- `/c/<id>/tickets/<ticketId>` renderiza página completa com header, status control, timeline, composer.
- Mudança de status atualiza UI e adiciona evento na timeline (optimistic + refetch).
- "Assumir ticket" dispara `PATCH /tickets/{id}/assign` (sem body) e o evento `assigned` aparece na timeline com `assignee_id` = manager logado.
- Composer publica comentário (body `{ text }`) → aparece evento `comment_added` com `payload.text` na timeline.
- Composer envia comentário e limpa textarea após sucesso.
- Modal antigo (Plan 4) removido.
- Lint/typecheck/test/build verdes.

**Tamanho estimado:** ~1000–1500 linhas de bite-sized tasks. Grande.

### Slice 6.6 — CRUD estrutura (Blocos / Unidades / Áreas comuns)

**Branch:** `feature/plan-6-6-structure-crud`

**Referência:** `docs/handoff/zivy-wa-green/project/src/page-crud.jsx` (249 linhas).

**Escopo:** 3 telas em `_app/c/$condoId/structure/{blocks,units,common-areas}.tsx` (rotas já existem como placeholders desde Plan 5.3 com role gate `manager`):

1. **Blocos:** tabela (nome, unidades count, criado em) + modal Criar/Editar (campos: **`name` + `description`** — ver schema do Core em `block_handler.go:14-34`; **não** há `floors`/número de andares no MVP atual) + confirm delete.
2. **Unidades:** filter por bloco (select) + tabela (número, bloco, morador atual) + modal Criar/Editar.
3. **Áreas comuns:** grid de cards + modal Criar/Editar (campos: **`name` + `type`** do enum `CommonAreaType` do Core — valores aceitos: `elevator | pool | lobby | garage | gym | other` (ver `common_area_handler.go:14-24`); **não** há `capacity` nem `rules` no MVP atual) + confirm delete.

**Limitações do MVP do Core registradas em 2026-05-17:** Bloco não tem `floors`; CommonArea não tem `capacity`/`rules`. A UI desta Slice reflete o schema atual. Campos extras (andares, capacidade, regras) são follow-up dependente de mudança no Core — abrir issue lá antes de prometer no handoff de produto.

**Endpoints Core (todos existem em `develop`, tenant via `X-Condo-ID`):**

- `GET/POST /blocks` + `GET/PATCH/DELETE /blocks/{id}`
- `GET/POST /units` + `GET/PATCH/DELETE /units/{id}`
- `GET/POST /common-areas` + `GET/PATCH/DELETE /common-areas/{id}`

Writes exigem `RequireRole(RoleManager, RoleStaff)`; reads aceitam viewer também. Implementação direta com TanStack Query + `openapi-fetch` — sem repository pattern.

**File structure:**

```
src/features/structure/
├── blocks/
│   ├── BlocksPage.tsx + .test.tsx + .module.css
│   ├── BlockFormDialog.tsx + .test.tsx
│   ├── useBlocks.ts + .test.tsx (GET)
│   ├── useUpsertBlock.ts + .test.tsx (POST/PATCH)
│   └── useDeleteBlock.ts + .test.tsx
├── units/                          # mesmo shape
└── common-areas/                   # mesmo shape
src/ui/
├── DataTable/                      # NOVO componente reutilizável (se valer; senão inline)
└── ConfirmDeleteDialog/            # NOVO Radix Dialog reutilizável
```

**Decisão:** `ConfirmDeleteDialog` é genérico o suficiente pra virar `src/ui/`. `DataTable` só vira componente compartilhado se os 3 listings tiverem 80%+ overlap; senão, copy-paste é mais barato (YAGNI).

**Acceptance:**

- 3 telas renderizam listas vindas do Core.
- Criar/editar via modal funciona, com toast/feedback.
- Delete pede confirmação.
- Estados loading/erro/empty cobertos.
- Role gate `manager` mantido.
- Lint/typecheck/test/build verdes.

**Tamanho estimado:** ~1500–2000 linhas de bite-sized tasks. Grande. Provavelmente quebra em 3 sub-slices (6.6.1 Blocos, 6.6.2 Unidades, 6.6.3 Áreas).

---

## Self-review

**Spec coverage (handoff vs plano):**

- Inbox page header com 2 ações → Slice 6.1 ✓
- Tickets page (table/cards/kanban + filtros + CSV + Novo chamado) → Slice 6.2 ✓
- Overview com KPIs + condo grid + atividade recente → Slice 6.3 ✓
- Approvals com lista PENDING + actions → Slice 6.4 ✓
- Ticket detail com timeline + composer → Slice 6.5 ✓
- CRUD Blocos/Unidades/Áreas → Slice 6.6 ✓
- Tokens WA Green → já feito em Plan 5, nada a fazer ✓
- Topbar/Sidebar → já feito em Plan 5, nada a fazer ✓

**Placeholder scan:** Slices 6.1 e 6.2 têm steps com código completo, comandos exatos, output esperado. Slices 6.3–6.6 estão explicitamente marcadas como "roadmap appendix, vira plan file próprio" — não são tasks executáveis, é uma decisão consciente, não placeholder.

**Type consistency:**

- `ViewMode` (`viewModeStore.ts`) = `"table" | "cards" | "kanban"` — usado em `TicketsFilters` e `TicketsPage`. Consistente.
- `Status` em `TicketsFilters.tsx` = `"all" | "open" | "in_progress" | "resolved" | "closed"` — bate com o enum do Core (`TicketStatus`) menos o `"all"` que é UI-only.
- `Priority` idem.
- `useTickets(condoId)` — herda assinatura de `useInboxTickets` (já existe). Após o `git mv`, rename apenas; sem mudança de shape.
- `useCanApprove(scope)` — usa `Scope` do `useScope` (`{ kind: "condo"; condoId } | { kind: "all" }`). Consistente.

## Apêndice — paridade com `core@develop`

Cross-check feito em 2026-05-17 contra `core@develop` (router `internal/adapters/http/router.go`). Endpoints disponíveis e mapeamento por slice:

| Slice | Endpoint Core                          | Verb                  | Role                                | Notas                                                                                                                                                                                                       |
| ----- | -------------------------------------- | --------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.2   | `/tickets`                             | GET                   | viewer+                             | Filtros `status`, `priority`, `protocol` na query                                                                                                                                                           |
| 6.2   | `/tickets/export`                      | GET                   | manager                             | `text/csv`, filtros `created_from`/`created_to` + `status`/`priority`/`protocol`, cap 10k linhas                                                                                                            |
| 6.2.1 | `/tickets`                             | POST                  | manager/staff                       | `CreateTicketRequest` (title/description/priority/location/resident…)                                                                                                                                       |
| 6.4   | `/residents`                           | GET                   | viewer+                             | Sem filtro server-side; cliente filtra `status === "PENDING"`                                                                                                                                               |
| 6.4   | `/residents/{id}/approve`              | PATCH                 | manager/staff                       | Body vazio                                                                                                                                                                                                  |
| 6.4   | `/residents/{id}/reject`               | PATCH                 | manager/staff                       | Body vazio; **NÃO** é DELETE                                                                                                                                                                                |
| 6.5   | `/tickets/{id}/events`                 | GET                   | viewer+                             | Tipos: `status_changed`, `assigned`, `comment_added` (sem `created`); ver `core/internal/domain/ticket_event.go:12-14`                                                                                      |
| 6.5   | `/tickets/{id}/status`                 | PATCH                 | manager/staff                       | `{ status }`                                                                                                                                                                                                |
| 6.5   | `/tickets/{id}/assign`                 | PATCH                 | manager/staff                       | **Sem body** — auto-atribuição (manager autenticado assume o ticket). Path é `/assign`, **não** `/assignee`. Ver `ticket_handler.go:399-422`. Atribuir a outro manager exige novo endpoint Core (follow-up) |
| 6.5   | `/tickets/{id}/comments`               | POST                  | manager/staff                       | `{ text: string }` (campo é `text`, **não** `note`); devolve `TicketEvent` com `payload.text`. Ver `ticket_handler.go:64-67, 444`                                                                           |
| 6.6   | `/blocks` + `/blocks/{id}`             | GET/POST/PATCH/DELETE | reads viewer+; writes manager/staff | Schema MVP: `{ name, description }` — sem `floors`/andares                                                                                                                                                  |
| 6.6   | `/units` + `/units/{id}`               | GET/POST/PATCH/DELETE | reads viewer+; writes manager/staff |                                                                                                                                                                                                             |
| 6.6   | `/common-areas` + `/common-areas/{id}` | GET/POST/PATCH/DELETE | reads viewer+; writes manager/staff | Schema MVP: `{ name, type }` (enum `elevator\|pool\|lobby\|garage\|gym\|other`) — sem `capacity`/`rules`                                                                                                    |

**Tenancy:** todas as rotas protegidas exigem header `X-Condo-ID` (middleware `Authenticate`). A única rota protegida sem `X-Condo-ID` é `GET /condos/me` (descoberta). Scopo `all` no front faz fan-out por condo (padrão herdado do `HttpActivityRepository` em Plan 5.4).

**Limitações Core conhecidas (follow-ups dependentes do backend):**

- **`PATCH /tickets/{id}/assign` é auto-atribuição** — manager logado assume o ticket; não aceita body. Para "atribuir a outro manager", abrir issue no Core propondo `PATCH /tickets/{id}/assign-to` com body `{ assignee_id }`. A Slice 6.5 entrega apenas o botão "Assumir".
- **`Block` não tem `floors`** — schema atual é `{ name, description }`. Se produto pedir "número de andares", abrir issue no Core para acrescentar o campo antes da Slice 6.6.
- **`CommonArea` não tem `capacity` nem `rules`** — schema atual é `{ name, type }` (enum). Mesmo raciocínio: campos extras dependem de mudança no Core.
- **`POST /tickets/{id}/comments` não dispara Telegram** — apenas persiste o evento `comment_added`. Notificações Telegram saem só em `CreateTicket` e `Assign` (ver `core/internal/app/ticket_service.go:116,205`). Footer do composer não deve prometer notificação.

**Follow-ups front-end conhecidos (não bloqueiam o Plan 6, herdados de plans anteriores):**

- **`routeGuards` confunde rede com RBAC** — `requireAuth`/`requireRole`/`requireRoleAny` em `src/lib/routeGuards.ts` usam `ensureQueryData(myCondosQueryOptions())` no `beforeLoad`; quando essa query rejeita (rede caiu, sessão expirou, 5xx no Core), o erro propaga como `errorComponent` indistinto de "sem permissão". **Impacto no Plan 6:** todas as rotas das Slices 6.4 (`_app/approvals`), 6.5 (`_app/c/$id/tickets/$ticketId`) e 6.6 (`_app/c/$id/structure/*`) passam por guards — quanto mais rotas guard-protected, mais visível o problema. **Não regride no Plan 6** (dívida pré-existente desde Plan 3, identificada no review do PR #17 do Plan 5.3). Slice própria futura: try/catch dentro do guard, diferenciar `redirect("/error?reason=network")` vs `redirect("/no-access")`, considerar fallback para cache stale de `myCondos`. Testes em `routeGuards.test.ts` mockando `ensureQueryData` para rejeitar. Ver memory `project_routeguards_error_ux.md` e [comentário no PR #17](https://github.com/ZivyApp/dashboard/pull/17#issuecomment-4467297268).

**Side-effects de notificação (referência rápida):**

| Endpoint                      | Notifica via Telegram?                        |
| ----------------------------- | --------------------------------------------- |
| `POST /tickets`               | ✅ managers do condo (`NotifyCondoManagers`)  |
| `PATCH /tickets/{id}/assign`  | ✅ morador autor do ticket (`NotifyResident`) |
| `POST /tickets/{id}/comments` | ❌ silencioso (só persiste evento)            |
| `PATCH /tickets/{id}/status`  | ❌ silencioso                                 |

**Tipos no `src/api/types.ts`:** regenerar via `npm run sync:swagger && npm run gen:api` no início da Slice 6.5 (e nas demais que tocarem em novos endpoints) para garantir paridade com `core/docs/swagger.json` atual.
