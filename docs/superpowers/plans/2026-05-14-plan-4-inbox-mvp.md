# Plan 4 — Inbox MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o placeholder de `/c/$condoId/inbox` pela primeira tela de trabalho real do dashboard: fila de tickets ativos (`open`+`in_progress`) com filtros, polling de 30s, e detalhe read-only acessível por URL via modal route.

**Architecture:** Camada de dados isolada em `src/features/inbox/` (hooks React Query + função pura de filtro). Componentes apresentacionais separados por responsabilidade (filtros, tabela desktop, cards mobile, modal). Primitivos reusáveis (`StatusBadge`, `PriorityChip`, `Modal`) em `src/ui/`. Rota filha modal sobre a lista usa pattern do TanStack Router (`<Outlet/>` no pai + arquivo `inbox/$ticketId.tsx` filho).

**Tech Stack:** Vite 5 · React 19 · TypeScript strict · TanStack Router (file-based) · TanStack Query · `@radix-ui/react-dialog` (já instalado) · CSS Modules + design tokens · Vitest + Testing Library · Storybook 8.

**Spec:** `docs/superpowers/specs/2026-05-13-plan-4-inbox-mvp-design.md` (commit `2abaca9`).

**Branch base:** `develop`. Cada slice abre PR separado contra `develop`.

---

## Convenções (lembretes obrigatórios — todas as tasks)

- **TDD:** test primeiro, rodar e ver falhar, implementar mínimo, rodar e ver passar, commit.
- **TypeScript strict:** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Para acessar `Record<K, string>` use fallback `?? ""`. Para props opcionais, **omitir a chave** em vez de passar `undefined`.
- **CSS Modules:** sempre `?? ""` ao acessar `styles.foo` em `Record`. Sem cor crua — usar tokens (stylelint barra). Acesso via constante intermediária `Record<Variant, string>`.
- **Botões:** sempre `type="button"` por default (já é assim no `Button.tsx`).
- **Mocks:** `vi.spyOn(...)` + `vi.restoreAllMocks()` em `afterEach`. Nunca `Object.defineProperty`.
- **Imports:** alias `@/*` → `src/*`. Não usar caminho relativo profundo.
- **routeTree.gen.ts:** é gerado pelo plugin Vite do TanStack Router. **Commitar** mas não editar à mão. Vai aparecer no diff dos PRs 4.2 e 4.3.
- **Co-localizar tests** ao lado do código (`Foo.test.tsx` ao lado de `Foo.tsx`).
- **Commits:** padrão `feat(inbox):`, `test(inbox):`, etc. Lefthook roda prettier + commitlint + eslint/stylelint nos arquivos staged.
- Após cada commit, rodar `npm run typecheck && npm run test` localmente. Se não passar, voltar antes do próximo commit.

---

## File Structure (visão consolidada)

```
src/design-tokens/
  colors.css                            (modify: add status/priority tokens)

src/ui/
  StatusBadge/
    StatusBadge.tsx                     (create)
    StatusBadge.module.css              (create)
    StatusBadge.test.tsx                (create)
    StatusBadge.stories.tsx             (create)
  PriorityChip/
    PriorityChip.tsx                    (create)
    PriorityChip.module.css             (create)
    PriorityChip.test.tsx               (create)
    PriorityChip.stories.tsx            (create)
  Modal/
    Modal.tsx                           (create)
    Modal.module.css                    (create)
    Modal.test.tsx                      (create)
    Modal.stories.tsx                   (create)

src/features/inbox/
  filterTickets.ts                      (create — pure function)
  filterTickets.test.ts                 (create)
  useInboxTickets.ts                    (create — React Query hook)
  useInboxTickets.test.tsx              (create)
  useTicket.ts                          (create — React Query hook)
  useTicket.test.tsx                    (create)
  InboxPage.tsx                         (create)
  InboxPage.test.tsx                    (create)
  InboxPage.module.css                  (create)
  InboxFilters.tsx                      (create)
  InboxFilters.test.tsx                 (create)
  InboxFilters.module.css               (create)
  InboxList.tsx                         (create)
  InboxList.module.css                  (create)
  TicketTable.tsx                       (create)
  TicketTable.module.css                (create)
  TicketCards.tsx                       (create)
  TicketCards.module.css                (create)
  TicketRow.tsx                         (create — shared by table & cards)
  TicketRow.test.tsx                    (create)
  TicketDetailModal.tsx                 (create)
  TicketDetailModal.test.tsx            (create)
  TicketDetailModal.module.css          (create)
  formatRelTime.ts                      (create — pequeno helper "há X min")
  formatRelTime.test.ts                 (create)

src/app/routes/_app/c/$condoId/
  inbox.tsx                             (modify: substituir placeholder)
  inbox/
    $ticketId.tsx                       (create — modal route filha)

src/app/routeTree.gen.ts                (auto-update pelo plugin Vite)
```

---

# Slice 4.1 — Foundations

**Branch:** `feature/plan-4-1-foundations`  
**PR:** contra `develop`  
**Escopo:** tokens, primitivos UI (`StatusBadge`, `PriorityChip`, `Modal`), helper de tempo, função pura `filterTickets`, hooks `useInboxTickets` e `useTicket`. **Sem alterar rotas.**

---

### Task 1: Adicionar tokens semânticos de status e prioridade

**Files:**

- Modify: `src/design-tokens/colors.css`

Tokens de status existentes em `colors.css` foram batizados pelo design antigo (`--status-urgent`, `--status-alta`, `--status-media`, `--status-onhold`) e correspondem a níveis de **prioridade**, não aos status de ticket atuais (`open|in_progress|resolved|closed`). Vamos **adicionar** novos tokens com nomes alinhados ao backend, sem remover os antigos (algum lugar pode estar usando — confirmar e remover em uma fatia futura se ninguém mais usar).

- [ ] **Step 1: Adicionar bloco de tokens em `:root` (tema light)**

Editar `src/design-tokens/colors.css`. Antes do bloco `:root[data-theme="dark"]`, depois da última linha `--info-fg: #1e40af;`, adicionar:

```css
/* Ticket status (open | in_progress | resolved | closed) */
--ticket-status-open-bg: #dbeafe;
--ticket-status-open-fg: #1e40af;
--ticket-status-in-progress-bg: #fef3c7;
--ticket-status-in-progress-fg: #92400e;
--ticket-status-resolved-bg: #d1fae5;
--ticket-status-resolved-fg: #065f46;
--ticket-status-closed-bg: #e5e7eb;
--ticket-status-closed-fg: #4b5563;
/* Ticket priority (low | medium | high) */
--ticket-priority-low-bg: #e0e7ff;
--ticket-priority-low-fg: #3730a3;
--ticket-priority-medium-bg: #ffedd5;
--ticket-priority-medium-fg: #9a3412;
--ticket-priority-high-bg: #fee2e2;
--ticket-priority-high-fg: #991b1b;
```

- [ ] **Step 2: Adicionar variantes dark equivalentes**

Dentro do bloco `:root[data-theme="dark"]` (no final, antes do `}`), adicionar:

```css
--ticket-status-open-bg: #1e3a8a;
--ticket-status-open-fg: #bfdbfe;
--ticket-status-in-progress-bg: #78350f;
--ticket-status-in-progress-fg: #fde68a;
--ticket-status-resolved-bg: #064e3b;
--ticket-status-resolved-fg: #a7f3d0;
--ticket-status-closed-bg: #374151;
--ticket-status-closed-fg: #d1d5db;
--ticket-priority-low-bg: #312e81;
--ticket-priority-low-fg: #c7d2fe;
--ticket-priority-medium-bg: #7c2d12;
--ticket-priority-medium-fg: #fed7aa;
--ticket-priority-high-bg: #7f1d1d;
--ticket-priority-high-fg: #fecaca;
```

- [ ] **Step 3: Verificar lint e build de tokens**

Run: `npm run lint`  
Expected: passa sem novos avisos.

- [ ] **Step 4: Commit**

```bash
git add src/design-tokens/colors.css
git commit -m "feat(tokens): adiciona tokens semânticos para status e prioridade de ticket"
```

---

### Task 2: Helper `formatRelTime` (tempo relativo "há X min")

**Files:**

- Create: `src/features/inbox/formatRelTime.ts`
- Create: `src/features/inbox/formatRelTime.test.ts`

Função pura para exibir "há 3 min", "há 2 h", "há 5 dias". Usada na lista, cards e modal. Mantém a feature isolada de qualquer lib de data; usar `Intl.RelativeTimeFormat` nativo, sem deps.

- [ ] **Step 1: Criar diretório**

```bash
mkdir -p src/features/inbox
```

- [ ] **Step 2: Test failing**

Criar `src/features/inbox/formatRelTime.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatRelTime } from "./formatRelTime";

const NOW = new Date("2026-05-14T12:00:00Z").getTime();

describe("formatRelTime", () => {
  it("retorna 'agora' para diferenças < 60s", () => {
    expect(formatRelTime("2026-05-14T11:59:30Z", NOW)).toBe("agora");
  });

  it("formata minutos", () => {
    expect(formatRelTime("2026-05-14T11:55:00Z", NOW)).toBe("há 5 min");
  });

  it("formata horas", () => {
    expect(formatRelTime("2026-05-14T09:00:00Z", NOW)).toBe("há 3 h");
  });

  it("formata dias", () => {
    expect(formatRelTime("2026-05-12T12:00:00Z", NOW)).toBe("há 2 dias");
  });

  it("formata 1 dia no singular", () => {
    expect(formatRelTime("2026-05-13T12:00:00Z", NOW)).toBe("há 1 dia");
  });

  it("retorna '—' para input inválido", () => {
    expect(formatRelTime(undefined, NOW)).toBe("—");
    expect(formatRelTime("not-a-date", NOW)).toBe("—");
  });
});
```

- [ ] **Step 3: Run test, verificar falha**

Run: `npx vitest run src/features/inbox/formatRelTime.test.ts`  
Expected: FAIL — "Cannot find module './formatRelTime'".

- [ ] **Step 4: Implementação mínima**

Criar `src/features/inbox/formatRelTime.ts`:

```ts
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function formatRelTime(iso: string | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const diff = Math.max(0, now - t);
  if (diff < MIN) return "agora";
  if (diff < HOUR) return `há ${Math.floor(diff / MIN)} min`;
  if (diff < DAY) return `há ${Math.floor(diff / HOUR)} h`;
  const days = Math.floor(diff / DAY);
  return `há ${days} ${days === 1 ? "dia" : "dias"}`;
}
```

- [ ] **Step 5: Run test, verificar pass**

Run: `npx vitest run src/features/inbox/formatRelTime.test.ts`  
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/inbox/formatRelTime.ts src/features/inbox/formatRelTime.test.ts
git commit -m "feat(inbox): adiciona helper formatRelTime"
```

---

### Task 3: Componente `StatusBadge`

**Files:**

- Create: `src/ui/StatusBadge/StatusBadge.tsx`
- Create: `src/ui/StatusBadge/StatusBadge.module.css`
- Create: `src/ui/StatusBadge/StatusBadge.test.tsx`
- Create: `src/ui/StatusBadge/StatusBadge.stories.tsx`

Pílula visual para status do ticket. 4 variantes (open, in_progress, resolved, closed). Cobertura de status desconhecido com fallback neutro (defensivo — backend pode adicionar status novo).

- [ ] **Step 1: Test failing**

Criar `src/ui/StatusBadge/StatusBadge.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renderiza label em pt-BR para 'open'", () => {
    render(<StatusBadge status="open" />);
    expect(screen.getByText("Aberto")).toBeInTheDocument();
  });

  it("renderiza label para 'in_progress'", () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText("Em andamento")).toBeInTheDocument();
  });

  it("renderiza label para 'resolved'", () => {
    render(<StatusBadge status="resolved" />);
    expect(screen.getByText("Resolvido")).toBeInTheDocument();
  });

  it("renderiza label para 'closed'", () => {
    render(<StatusBadge status="closed" />);
    expect(screen.getByText("Fechado")).toBeInTheDocument();
  });

  it("aplica classe da variante", () => {
    render(<StatusBadge status="open" />);
    expect(screen.getByText("Aberto").className).toContain("open");
  });

  it("renderiza fallback para status desconhecido", () => {
    // @ts-expect-error — testando comportamento defensivo
    render(<StatusBadge status="weird" />);
    expect(screen.getByText("weird")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verificar falha**

Run: `npx vitest run src/ui/StatusBadge/StatusBadge.test.tsx`  
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementação**

Criar `src/ui/StatusBadge/StatusBadge.module.css`:

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  font-size: var(--fs-xs);
  font-weight: var(--fw-medium);
  border-radius: var(--radius-md);
  line-height: var(--lh-normal);
  white-space: nowrap;
}

.open {
  background-color: var(--ticket-status-open-bg);
  color: var(--ticket-status-open-fg);
}

.in_progress {
  background-color: var(--ticket-status-in-progress-bg);
  color: var(--ticket-status-in-progress-fg);
}

.resolved {
  background-color: var(--ticket-status-resolved-bg);
  color: var(--ticket-status-resolved-fg);
}

.closed {
  background-color: var(--ticket-status-closed-bg);
  color: var(--ticket-status-closed-fg);
}

.unknown {
  background-color: var(--bg-muted);
  color: var(--fg-secondary);
}
```

Criar `src/ui/StatusBadge/StatusBadge.tsx`:

```tsx
import styles from "./StatusBadge.module.css";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface StatusBadgeProps {
  status: TicketStatus;
}

const LABELS: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
};

const VARIANT_CLASS: Record<TicketStatus, string> = {
  open: styles.open ?? "",
  in_progress: styles.in_progress ?? "",
  resolved: styles.resolved ?? "",
  closed: styles.closed ?? "",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = LABELS[status] ?? status;
  const variantCls = VARIANT_CLASS[status] ?? styles.unknown ?? "";
  const cls = [styles.badge, variantCls].filter(Boolean).join(" ");
  return <span className={cls}>{label}</span>;
}
```

- [ ] **Step 4: Run test, verificar pass**

Run: `npx vitest run src/ui/StatusBadge/StatusBadge.test.tsx`  
Expected: PASS (6 tests).

- [ ] **Step 5: Story do Storybook**

Criar `src/ui/StatusBadge/StatusBadge.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { StatusBadge } from "./StatusBadge";

const meta = {
  title: "UI/StatusBadge",
  component: StatusBadge,
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = { args: { status: "open" } };
export const InProgress: Story = { args: { status: "in_progress" } };
export const Resolved: Story = { args: { status: "resolved" } };
export const Closed: Story = { args: { status: "closed" } };

export const Todos: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <StatusBadge status="open" />
      <StatusBadge status="in_progress" />
      <StatusBadge status="resolved" />
      <StatusBadge status="closed" />
    </div>
  ),
};
```

- [ ] **Step 6: Typecheck + lint + commit**

Run: `npm run typecheck && npm run lint`  
Expected: ambos verdes.

```bash
git add src/ui/StatusBadge/
git commit -m "feat(ui): adiciona componente StatusBadge"
```

---

### Task 4: Componente `PriorityChip`

**Files:**

- Create: `src/ui/PriorityChip/PriorityChip.tsx`
- Create: `src/ui/PriorityChip/PriorityChip.module.css`
- Create: `src/ui/PriorityChip/PriorityChip.test.tsx`
- Create: `src/ui/PriorityChip/PriorityChip.stories.tsx`

Chip para prioridade do ticket. Backend usa `low | medium | high`.

- [ ] **Step 1: Test failing**

Criar `src/ui/PriorityChip/PriorityChip.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriorityChip } from "./PriorityChip";

describe("PriorityChip", () => {
  it("renderiza 'Baixa' para 'low'", () => {
    render(<PriorityChip priority="low" />);
    expect(screen.getByText("Baixa")).toBeInTheDocument();
  });

  it("renderiza 'Média' para 'medium'", () => {
    render(<PriorityChip priority="medium" />);
    expect(screen.getByText("Média")).toBeInTheDocument();
  });

  it("renderiza 'Alta' para 'high'", () => {
    render(<PriorityChip priority="high" />);
    expect(screen.getByText("Alta")).toBeInTheDocument();
  });

  it("aplica classe da variante", () => {
    render(<PriorityChip priority="high" />);
    expect(screen.getByText("Alta").className).toContain("high");
  });

  it("renderiza fallback para prioridade desconhecida", () => {
    // @ts-expect-error
    render(<PriorityChip priority="urgent" />);
    expect(screen.getByText("urgent")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verificar falha**

Run: `npx vitest run src/ui/PriorityChip/PriorityChip.test.tsx`  
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementação**

Criar `src/ui/PriorityChip/PriorityChip.module.css`:

```css
.chip {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  font-size: var(--fs-xs);
  font-weight: var(--fw-medium);
  border-radius: var(--radius-md);
  line-height: var(--lh-normal);
  white-space: nowrap;
}

.low {
  background-color: var(--ticket-priority-low-bg);
  color: var(--ticket-priority-low-fg);
}

.medium {
  background-color: var(--ticket-priority-medium-bg);
  color: var(--ticket-priority-medium-fg);
}

.high {
  background-color: var(--ticket-priority-high-bg);
  color: var(--ticket-priority-high-fg);
}

.unknown {
  background-color: var(--bg-muted);
  color: var(--fg-secondary);
}
```

Criar `src/ui/PriorityChip/PriorityChip.tsx`:

```tsx
import styles from "./PriorityChip.module.css";

export type TicketPriority = "low" | "medium" | "high";

interface PriorityChipProps {
  priority: TicketPriority;
}

const LABELS: Record<TicketPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

const VARIANT_CLASS: Record<TicketPriority, string> = {
  low: styles.low ?? "",
  medium: styles.medium ?? "",
  high: styles.high ?? "",
};

export function PriorityChip({ priority }: PriorityChipProps) {
  const label = LABELS[priority] ?? priority;
  const variantCls = VARIANT_CLASS[priority] ?? styles.unknown ?? "";
  const cls = [styles.chip, variantCls].filter(Boolean).join(" ");
  return <span className={cls}>{label}</span>;
}
```

- [ ] **Step 4: Run test, verificar pass**

Run: `npx vitest run src/ui/PriorityChip/PriorityChip.test.tsx`  
Expected: PASS (5 tests).

- [ ] **Step 5: Story**

Criar `src/ui/PriorityChip/PriorityChip.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { PriorityChip } from "./PriorityChip";

const meta = {
  title: "UI/PriorityChip",
  component: PriorityChip,
} satisfies Meta<typeof PriorityChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Low: Story = { args: { priority: "low" } };
export const Medium: Story = { args: { priority: "medium" } };
export const High: Story = { args: { priority: "high" } };

export const Todos: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <PriorityChip priority="low" />
      <PriorityChip priority="medium" />
      <PriorityChip priority="high" />
    </div>
  ),
};
```

- [ ] **Step 6: Typecheck + commit**

Run: `npm run typecheck && npm run lint`  
Expected: verde.

```bash
git add src/ui/PriorityChip/
git commit -m "feat(ui): adiciona componente PriorityChip"
```

---

### Task 5: Componente `Modal` (Radix Dialog wrapper)

**Files:**

- Create: `src/ui/Modal/Modal.tsx`
- Create: `src/ui/Modal/Modal.module.css`
- Create: `src/ui/Modal/Modal.test.tsx`
- Create: `src/ui/Modal/Modal.stories.tsx`

Wrapper sobre `@radix-ui/react-dialog`. API simples: aberto controlado, callback de fechamento, título acessível, children. Cobre foco trap, Esc, click overlay, `aria-labelledby`. Mobile fullscreen via media query.

- [ ] **Step 1: Test failing**

Criar `src/ui/Modal/Modal.test.tsx`:

```tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Modal", () => {
  it("não renderiza nada quando open=false", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Teste">
        <p>conteúdo</p>
      </Modal>,
    );
    expect(screen.queryByText("conteúdo")).not.toBeInTheDocument();
  });

  it("renderiza children quando open=true", () => {
    render(
      <Modal open={true} onClose={() => {}} title="Teste">
        <p>conteúdo</p>
      </Modal>,
    );
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });

  it("expõe título acessível via dialog", () => {
    render(
      <Modal open={true} onClose={() => {}} title="Detalhes do ticket">
        <p>x</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Detalhes do ticket" })).toBeInTheDocument();
  });

  it("chama onClose ao apertar Esc", async () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="T">
        <p>x</p>
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("chama onClose ao clicar no botão fechar", async () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="T">
        <p>x</p>
      </Modal>,
    );
    await userEvent.click(screen.getByRole("button", { name: /fechar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test, verificar falha**

Run: `npx vitest run src/ui/Modal/Modal.test.tsx`  
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementação CSS**

Criar `src/ui/Modal/Modal.module.css`:

```css
.overlay {
  position: fixed;
  inset: 0;
  background-color: var(--overlay-bg);
  z-index: var(--z-modal-overlay);
  animation: fadeIn var(--duration-fast) var(--easing-standard);
}

.content {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: var(--z-modal);
  padding: var(--space-4);
  pointer-events: none;
}

.dialog {
  background-color: var(--bg-elevated);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: min(640px, 100%);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  animation: slideUp var(--duration-base) var(--easing-standard);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border);
}

.title {
  margin: 0;
  font-size: var(--fs-lg);
  font-weight: var(--fw-semibold);
  color: var(--fg-primary);
}

.close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--fg-secondary);
  padding: var(--space-1);
  border-radius: var(--radius-md);
}

.close:hover {
  background-color: var(--bg-muted);
  color: var(--fg-primary);
}

.body {
  padding: var(--space-5);
  overflow-y: auto;
  flex: 1;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 767px) {
  .content {
    padding: 0;
  }

  .dialog {
    width: 100%;
    height: 100dvh;
    max-height: 100dvh;
    border-radius: 0;
  }
}
```

> **Nota:** se `--z-modal-overlay` / `--z-modal` não existirem em `src/design-tokens/z-index.css`, abrir esse arquivo e adicionar (`--z-modal-overlay: 50; --z-modal: 51;`). Se já existirem com outros nomes, usar os existentes — manter `git diff src/design-tokens/z-index.css` mínimo.

- [ ] **Step 4: Implementação TSX**

Criar `src/ui/Modal/Modal.tsx`:

```tsx
import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import styles from "./Modal.module.css";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content} aria-describedby={undefined}>
          <div className={styles.dialog}>
            <div className={styles.header}>
              <Dialog.Title className={styles.title}>{title}</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className={styles.close} aria-label="Fechar">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
            <div className={styles.body}>{children}</div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 5: Run test, verificar pass**

Run: `npx vitest run src/ui/Modal/Modal.test.tsx`  
Expected: PASS (5 tests).

> Se algum teste falhar com "could not find role 'dialog'", investigar — Radix renderiza no portal, jsdom precisa do `document.body` montado. RTL faz isso por default.

- [ ] **Step 6: Story**

Criar `src/ui/Modal/Modal.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "@/ui/Button/Button";

const meta = {
  title: "UI/Modal",
  component: Modal,
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Abrir modal</Button>
        <Modal open={open} onClose={() => setOpen(false)} title="Detalhes do ticket">
          <p>Conteúdo da modal aqui.</p>
        </Modal>
      </>
    );
  },
};
```

- [ ] **Step 7: Typecheck + commit**

Run: `npm run typecheck && npm run lint && npm run test`  
Expected: tudo verde.

```bash
git add src/ui/Modal/ src/design-tokens/z-index.css
git commit -m "feat(ui): adiciona Modal sobre Radix Dialog"
```

> Se `z-index.css` não foi alterado, ajustar o `git add`.

---

### Task 6: Função pura `filterTickets`

**Files:**

- Create: `src/features/inbox/filterTickets.ts`
- Create: `src/features/inbox/filterTickets.test.ts`

Função pura que recebe lista + filtros e devolve lista filtrada+ordenada. Sem efeitos colaterais. Não importa nada do React.

- [ ] **Step 1: Test failing**

Criar `src/features/inbox/filterTickets.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filterTickets, type Ticket, type FilterState } from "./filterTickets";

const t = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: "id-1",
  protocol: "TKT-2026-00001",
  title: "Elevador parado",
  status: "open",
  priority: "high",
  resident_name: "Mariana Costa",
  unit_number: "203",
  block_name: "Bloco A",
  common_area_name: undefined,
  updated_at: "2026-05-14T10:00:00Z",
  ...overrides,
});

const noFilters: FilterState = { search: "", status: "all", priority: "all" };

describe("filterTickets", () => {
  it("retorna identidade quando não há filtros", () => {
    const list = [t({ id: "a" }), t({ id: "b" })];
    expect(filterTickets(list, noFilters)).toHaveLength(2);
  });

  it("filtra por status open", () => {
    const list = [t({ id: "a", status: "open" }), t({ id: "b", status: "in_progress" })];
    const out = filterTickets(list, { ...noFilters, status: "open" });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("a");
  });

  it("filtra por priority high", () => {
    const list = [t({ id: "a", priority: "high" }), t({ id: "b", priority: "low" })];
    const out = filterTickets(list, { ...noFilters, priority: "high" });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("a");
  });

  it("busca por título case-insensitive", () => {
    const list = [t({ id: "a", title: "Elevador parado" }), t({ id: "b", title: "Vazamento" })];
    const out = filterTickets(list, { ...noFilters, search: "ELEV" });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("a");
  });

  it("busca por protocolo", () => {
    const list = [
      t({ id: "a", protocol: "TKT-2026-00041" }),
      t({ id: "b", protocol: "TKT-2026-00099" }),
    ];
    const out = filterTickets(list, { ...noFilters, search: "00041" });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("a");
  });

  it("busca por nome do morador", () => {
    const list = [
      t({ id: "a", resident_name: "Mariana Costa" }),
      t({ id: "b", resident_name: "Lucas Ferreira" }),
    ];
    const out = filterTickets(list, { ...noFilters, search: "lucas" });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("b");
  });

  it("combina status + priority + search", () => {
    const list = [
      t({ id: "a", status: "open", priority: "high", title: "Elevador" }),
      t({ id: "b", status: "in_progress", priority: "high", title: "Elevador" }),
      t({ id: "c", status: "open", priority: "low", title: "Elevador" }),
      t({ id: "d", status: "open", priority: "high", title: "Vazamento" }),
    ];
    const out = filterTickets(list, { search: "elev", status: "open", priority: "high" });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("a");
  });

  it("ordena por prioridade desc, depois updated_at desc", () => {
    const list = [
      t({ id: "low-old", priority: "low", updated_at: "2026-05-10T00:00:00Z" }),
      t({ id: "high-old", priority: "high", updated_at: "2026-05-10T00:00:00Z" }),
      t({ id: "high-new", priority: "high", updated_at: "2026-05-14T00:00:00Z" }),
      t({ id: "med-new", priority: "medium", updated_at: "2026-05-14T00:00:00Z" }),
    ];
    const out = filterTickets(list, noFilters);
    expect(out.map((x) => x.id)).toEqual(["high-new", "high-old", "med-new", "low-old"]);
  });

  it("lida com lista vazia", () => {
    expect(filterTickets([], noFilters)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test, verificar falha**

Run: `npx vitest run src/features/inbox/filterTickets.test.ts`  
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementação**

Criar `src/features/inbox/filterTickets.ts`:

```ts
import type { TicketStatus } from "@/ui/StatusBadge/StatusBadge";
import type { TicketPriority } from "@/ui/PriorityChip/PriorityChip";

export interface Ticket {
  id: string;
  protocol: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  resident_name?: string;
  unit_number?: string;
  block_name?: string;
  common_area_name?: string;
  updated_at: string;
}

export interface FilterState {
  search: string;
  status: TicketStatus | "all";
  priority: TicketPriority | "all";
}

const PRIORITY_ORDER: Record<TicketPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function matchesSearch(ticket: Ticket, q: string): boolean {
  const needle = q.toLowerCase();
  if (!needle) return true;
  if (ticket.title.toLowerCase().includes(needle)) return true;
  if (ticket.protocol.toLowerCase().includes(needle)) return true;
  if (ticket.resident_name?.toLowerCase().includes(needle)) return true;
  return false;
}

export function filterTickets(list: Ticket[], filters: FilterState): Ticket[] {
  const filtered = list.filter((t) => {
    if (filters.status !== "all" && t.status !== filters.status) return false;
    if (filters.priority !== "all" && t.priority !== filters.priority) return false;
    if (!matchesSearch(t, filters.search)) return false;
    return true;
  });
  return [...filtered].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 99;
    const pb = PRIORITY_ORDER[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    return Date.parse(b.updated_at) - Date.parse(a.updated_at);
  });
}
```

- [ ] **Step 4: Run test, verificar pass**

Run: `npx vitest run src/features/inbox/filterTickets.test.ts`  
Expected: PASS (9 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck`  
Expected: verde.

```bash
git add src/features/inbox/filterTickets.ts src/features/inbox/filterTickets.test.ts
git commit -m "feat(inbox): adiciona função pura filterTickets"
```

---

### Task 7: Hook `useInboxTickets`

**Files:**

- Create: `src/features/inbox/useInboxTickets.ts`
- Create: `src/features/inbox/useInboxTickets.test.tsx`

Hook que faz **2 chamadas em paralelo** (`?status=open` + `?status=in_progress`) e mescla. Para testar React Query no Vitest, criar um `QueryClient` por teste e envolver com `QueryClientProvider`.

- [ ] **Step 1: Test failing**

Criar `src/features/inbox/useInboxTickets.test.tsx`:

```tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { api } from "@/api/client";
import { useInboxTickets } from "./useInboxTickets";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const mkClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useInboxTickets", () => {
  it("dispara 2 calls em paralelo (open + in_progress) e mescla resultado", async () => {
    const get = vi.spyOn(api, "GET").mockImplementation(((
      path: string,
      opts: { params: { query: { status: string } } },
    ) => {
      const status = opts.params.query.status;
      if (status === "open") {
        return Promise.resolve({
          data: [
            {
              id: "a",
              protocol: "TKT-1",
              title: "x",
              status: "open",
              priority: "high",
              updated_at: "2026-05-14T00:00:00Z",
            },
          ],
          error: undefined,
        });
      }
      return Promise.resolve({
        data: [
          {
            id: "b",
            protocol: "TKT-2",
            title: "y",
            status: "in_progress",
            priority: "low",
            updated_at: "2026-05-14T00:00:00Z",
          },
        ],
        error: undefined,
      });
    }) as unknown as typeof api.GET);

    const qc = mkClient();
    const { result } = renderHook(() => useInboxTickets("condo-1"), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledTimes(2);
    expect(result.current.data?.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });

  it("retorna erro se uma das duas chamadas falhar", async () => {
    vi.spyOn(api, "GET").mockImplementation(((
      _: string,
      opts: { params: { query: { status: string } } },
    ) => {
      if (opts.params.query.status === "open") {
        return Promise.resolve({ data: undefined, error: { message: "boom" } });
      }
      return Promise.resolve({ data: [], error: undefined });
    }) as unknown as typeof api.GET);

    const qc = mkClient();
    const { result } = renderHook(() => useInboxTickets("condo-1"), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("emite console.warn quando lista total > 200", async () => {
    const big = Array.from({ length: 201 }, (_, i) => ({
      id: `t${i}`,
      protocol: `TKT-${i}`,
      title: "x",
      status: "open" as const,
      priority: "low" as const,
      updated_at: "2026-05-14T00:00:00Z",
    }));
    vi.spyOn(api, "GET").mockResolvedValue({ data: big, error: undefined } as unknown as Awaited<
      ReturnType<typeof api.GET>
    >);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const qc = mkClient();
    const { result } = renderHook(() => useInboxTickets("condo-1"), { wrapper: wrapper(qc) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Inbox"));
  });
});
```

- [ ] **Step 2: Run test, verificar falha**

Run: `npx vitest run src/features/inbox/useInboxTickets.test.tsx`  
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementação**

Criar `src/features/inbox/useInboxTickets.ts`:

```ts
import { useQueries } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Ticket } from "./filterTickets";
import type { TicketStatus } from "@/ui/StatusBadge/StatusBadge";

const ACTIVE_STATUSES: TicketStatus[] = ["open", "in_progress"];

async function fetchByStatus(status: TicketStatus): Promise<Ticket[]> {
  const { data, error } = await api.GET("/tickets", {
    params: { query: { status } },
  });
  if (error) throw new Error(`GET /tickets?status=${status} failed`, { cause: error });
  return (data ?? []) as Ticket[];
}

export function useInboxTickets(condoId: string) {
  const queries = useQueries({
    queries: ACTIVE_STATUSES.map((status) => ({
      queryKey: ["tickets", condoId, status] as const,
      queryFn: () => fetchByStatus(status),
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
      staleTime: 10_000,
    })),
  });

  const isPending = queries.some((q) => q.isPending);
  const isFetching = queries.some((q) => q.isFetching);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.error)?.error;
  const isSuccess = queries.every((q) => q.isSuccess);

  const data = isSuccess ? queries.flatMap((q) => q.data ?? []) : undefined;

  if (data && data.length > 200) {
    console.warn(
      `Inbox: ${data.length} tickets ativos no condo ${condoId}. Considerar paginação no Core.`,
    );
  }

  function refetch() {
    queries.forEach((q) => {
      void q.refetch();
    });
  }

  return { data, isPending, isFetching, isError, isSuccess, error, refetch };
}
```

- [ ] **Step 4: Run test, verificar pass**

Run: `npx vitest run src/features/inbox/useInboxTickets.test.tsx`  
Expected: PASS (3 tests).

> Se algum teste falhar por tipo (mock muito frouxo), ajustar o cast no `mockImplementation`. A estratégia é cast em `as unknown as typeof api.GET` que aceita o mock sem inferir todo o overload.

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck`  
Expected: verde.

```bash
git add src/features/inbox/useInboxTickets.ts src/features/inbox/useInboxTickets.test.tsx
git commit -m "feat(inbox): adiciona hook useInboxTickets com polling de 30s"
```

---

### Task 8: Hook `useTicket`

**Files:**

- Create: `src/features/inbox/useTicket.ts`
- Create: `src/features/inbox/useTicket.test.tsx`

Query single ticket por id. Usado pela modal.

- [ ] **Step 1: Test failing**

Criar `src/features/inbox/useTicket.test.tsx`:

```tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { api } from "@/api/client";
import { useTicket } from "./useTicket";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const mkClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useTicket", () => {
  it("busca o ticket por id e expõe data", async () => {
    vi.spyOn(api, "GET").mockResolvedValue({
      data: {
        id: "t1",
        protocol: "TKT-1",
        title: "x",
        status: "open",
        priority: "high",
        updated_at: "2026-05-14T00:00:00Z",
      },
      error: undefined,
    } as unknown as Awaited<ReturnType<typeof api.GET>>);

    const qc = mkClient();
    const { result } = renderHook(() => useTicket("t1"), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe("t1");
  });

  it("propaga erro 404", async () => {
    vi.spyOn(api, "GET").mockResolvedValue({
      data: undefined,
      error: { message: "not found" },
      response: { status: 404 } as Response,
    } as unknown as Awaited<ReturnType<typeof api.GET>>);

    const qc = mkClient();
    const { result } = renderHook(() => useTicket("zzz"), { wrapper: wrapper(qc) });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

- [ ] **Step 2: Run test, verificar falha**

Run: `npx vitest run src/features/inbox/useTicket.test.tsx`  
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementação**

Criar `src/features/inbox/useTicket.ts`:

```ts
import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Ticket } from "./filterTickets";

export function ticketQueryOptions(ticketId: string) {
  return queryOptions({
    queryKey: ["ticket", ticketId] as const,
    queryFn: async (): Promise<Ticket> => {
      const { data, error } = await api.GET("/tickets/{id}", {
        params: { path: { id: ticketId } },
      });
      if (error) throw new Error(`GET /tickets/${ticketId} failed`, { cause: error });
      if (!data) throw new Error(`GET /tickets/${ticketId} returned empty body`);
      return data as Ticket;
    },
    staleTime: 30_000,
  });
}

export function useTicket(ticketId: string) {
  return useQuery(ticketQueryOptions(ticketId));
}
```

- [ ] **Step 4: Run test, verificar pass**

Run: `npx vitest run src/features/inbox/useTicket.test.tsx`  
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck + commit**

```bash
git add src/features/inbox/useTicket.ts src/features/inbox/useTicket.test.tsx
git commit -m "feat(inbox): adiciona hook useTicket"
```

---

### Task 9: Slice 4.1 — fechar PR

- [ ] **Step 1: Rodar suite completa**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`  
Expected: tudo verde.

- [ ] **Step 2: Push e abrir PR**

```bash
git push -u origin feature/plan-4-1-foundations
gh pr create --base develop --title "feat(plan-4): foundations — tokens, primitivos UI, hooks de inbox" --body "$(cat <<'EOF'
## Summary
- Tokens semânticos para status (`open|in_progress|resolved|closed`) e prioridade (`low|medium|high`) em light + dark.
- Componentes `StatusBadge`, `PriorityChip`, `Modal` (sobre Radix Dialog) com stories e tests.
- Hooks `useInboxTickets` (2 calls em paralelo, polling 30s) e `useTicket`.
- Função pura `filterTickets` (busca + status + priority + ordenação).
- Helper `formatRelTime`.

Spec: `docs/superpowers/specs/2026-05-13-plan-4-inbox-mvp-design.md`.
Slice 4.1 do Plan 4. Sem mudanças em rotas — slice 4.2 conecta na UI.

## Test plan
- [ ] CI verde (typecheck, lint, test, build).
- [ ] Storybook mostra `StatusBadge`, `PriorityChip`, `Modal` em todas as variantes (`npm run storybook`).
- [ ] Modal abre, Esc fecha, click overlay fecha, foco trapeado.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

# Slice 4.2 — Inbox list page

**Branch:** `feature/plan-4-2-inbox-list` (sair de `develop` atualizada com 4.1 mergeada)  
**PR:** contra `develop`  
**Escopo:** componentes `TicketRow`, `TicketTable`, `TicketCards`, `InboxList`, `InboxFilters`, `InboxPage`. Substituir placeholder de `inbox.tsx`. Click no ticket: navega para `./$ticketId` (rota ainda não existe — 404 isolado, resolvido em 4.3).

---

### Task 10: Componente `TicketRow` (presentational, único)

**Files:**

- Create: `src/features/inbox/TicketRow.tsx`
- Create: `src/features/inbox/TicketRow.test.tsx`

`TicketRow` é um componente apresentacional que recebe `ticket` + `variant` ('row' para tabela, 'card' para mobile) + `onClick`. Compartilhado por `TicketTable` e `TicketCards` para garantir consistência de fonte de dados, mas com estilos diferentes via prop.

> **Nota:** vamos manter dois renderizadores — `TicketTableRow` dentro de `TicketTable.tsx` e `TicketCard` dentro de `TicketCards.tsx`. `TicketRow.tsx` exporta os dois para co-localização. Não vale a pena uma "componente único polimórfico" — markup `<tr>` vs `<div>` é diferente o suficiente para justificar dois.

Reformulando: vamos pular essa task e ir direto para `TicketTable` e `TicketCards`. Renomear próximas tasks de acordo. **Esta task fica vazia, marca como skip — apenas remover/skipar mentalmente.**

- [ ] **Step 1: Skip — não criar arquivo**

Vamos para Task 11.

---

### Task 11: Componente `TicketTable` (desktop)

**Files:**

- Create: `src/features/inbox/TicketTable.tsx`
- Create: `src/features/inbox/TicketTable.module.css`

Tabela para tela ≥ 768px. Recebe lista + `onPick(ticketId)`.

- [ ] **Step 1: CSS**

Criar `src/features/inbox/TicketTable.module.css`:

```css
.wrap {
  width: 100%;
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-sm);
}

.table thead {
  text-align: left;
  background-color: var(--bg-muted);
  color: var(--fg-secondary);
}

.table th {
  padding: var(--space-3) var(--space-4);
  font-weight: var(--fw-medium);
  border-bottom: 1px solid var(--border);
  font-size: var(--fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.table tbody tr {
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background-color var(--duration-fast) var(--easing-standard);
}

.table tbody tr:hover {
  background-color: var(--bg-muted);
}

.table td {
  padding: var(--space-3) var(--space-4);
  vertical-align: top;
  color: var(--fg-primary);
}

.proto {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--fg-secondary);
  white-space: nowrap;
}

.title {
  font-weight: var(--fw-medium);
  margin-bottom: var(--space-1);
}

.sub {
  font-size: var(--fs-xs);
  color: var(--fg-tertiary);
}

.time {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--fg-tertiary);
  white-space: nowrap;
}
```

- [ ] **Step 2: TSX**

Criar `src/features/inbox/TicketTable.tsx`:

```tsx
import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { PriorityChip } from "@/ui/PriorityChip/PriorityChip";
import type { Ticket } from "./filterTickets";
import { formatRelTime } from "./formatRelTime";
import styles from "./TicketTable.module.css";

interface TicketTableProps {
  tickets: Ticket[];
  onPick: (ticketId: string) => void;
}

function locationLabel(t: Ticket): string {
  if (t.common_area_name) return t.common_area_name;
  if (t.block_name && t.unit_number) return `${t.block_name} · ${t.unit_number}`;
  if (t.unit_number) return t.unit_number;
  return "—";
}

export function TicketTable({ tickets, onPick }: TicketTableProps) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Protocolo</th>
            <th>Chamado</th>
            <th>Status</th>
            <th>Prioridade</th>
            <th>Atualizado</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id} onClick={() => onPick(t.id)}>
              <td className={styles.proto}>{t.protocol}</td>
              <td>
                <div className={styles.title}>{t.title}</div>
                <div className={styles.sub}>
                  {locationLabel(t)}
                  {t.resident_name ? ` · ${t.resident_name}` : ""}
                </div>
              </td>
              <td>
                <StatusBadge status={t.status} />
              </td>
              <td>
                <PriorityChip priority={t.priority} />
              </td>
              <td className={styles.time}>{formatRelTime(t.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`  
Expected: verde.

- [ ] **Step 4: Commit (sem teste — apresentacional puro coberto por InboxPage)**

```bash
git add src/features/inbox/TicketTable.tsx src/features/inbox/TicketTable.module.css
git commit -m "feat(inbox): adiciona TicketTable (layout desktop)"
```

---

### Task 12: Componente `TicketCards` (mobile)

**Files:**

- Create: `src/features/inbox/TicketCards.tsx`
- Create: `src/features/inbox/TicketCards.module.css`

- [ ] **Step 1: CSS**

Criar `src/features/inbox/TicketCards.module.css`:

```css
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.card {
  background-color: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.card:hover {
  background-color: var(--bg-muted);
}

.title {
  font-weight: var(--fw-medium);
  font-size: var(--fs-base);
  color: var(--fg-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.proto {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--fg-tertiary);
}

.time {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--fg-tertiary);
  margin-left: auto;
}
```

- [ ] **Step 2: TSX**

Criar `src/features/inbox/TicketCards.tsx`:

```tsx
import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { PriorityChip } from "@/ui/PriorityChip/PriorityChip";
import type { Ticket } from "./filterTickets";
import { formatRelTime } from "./formatRelTime";
import styles from "./TicketCards.module.css";

interface TicketCardsProps {
  tickets: Ticket[];
  onPick: (ticketId: string) => void;
}

export function TicketCards({ tickets, onPick }: TicketCardsProps) {
  return (
    <div className={styles.list}>
      {tickets.map((t) => (
        <button key={t.id} type="button" className={styles.card} onClick={() => onPick(t.id)}>
          <div className={styles.title}>{t.title}</div>
          <div className={styles.row}>
            <span className={styles.proto}>{t.protocol}</span>
            <PriorityChip priority={t.priority} />
          </div>
          <div className={styles.row}>
            <StatusBadge status={t.status} />
            <span className={styles.time}>{formatRelTime(t.updated_at)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

Run: `npm run typecheck`  
Expected: verde.

```bash
git add src/features/inbox/TicketCards.tsx src/features/inbox/TicketCards.module.css
git commit -m "feat(inbox): adiciona TicketCards (layout mobile)"
```

---

### Task 13: Componente `InboxList` (decide table vs cards)

**Files:**

- Create: `src/features/inbox/InboxList.tsx`
- Create: `src/features/inbox/InboxList.module.css`

Renderiza ambas as visões; CSS controla qual aparece via media query.

- [ ] **Step 1: CSS**

Criar `src/features/inbox/InboxList.module.css`:

```css
.desktop {
  display: block;
}

.mobile {
  display: none;
}

@media (max-width: 767px) {
  .desktop {
    display: none;
  }

  .mobile {
    display: block;
  }
}
```

- [ ] **Step 2: TSX**

Criar `src/features/inbox/InboxList.tsx`:

```tsx
import { TicketTable } from "./TicketTable";
import { TicketCards } from "./TicketCards";
import type { Ticket } from "./filterTickets";
import styles from "./InboxList.module.css";

interface InboxListProps {
  tickets: Ticket[];
  onPick: (ticketId: string) => void;
}

export function InboxList({ tickets, onPick }: InboxListProps) {
  return (
    <>
      <div className={styles.desktop}>
        <TicketTable tickets={tickets} onPick={onPick} />
      </div>
      <div className={styles.mobile}>
        <TicketCards tickets={tickets} onPick={onPick} />
      </div>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/inbox/InboxList.tsx src/features/inbox/InboxList.module.css
git commit -m "feat(inbox): adiciona InboxList (responsivo)"
```

---

### Task 14: Componente `InboxFilters`

**Files:**

- Create: `src/features/inbox/InboxFilters.tsx`
- Create: `src/features/inbox/InboxFilters.module.css`
- Create: `src/features/inbox/InboxFilters.test.tsx`

Search + segmented status + select de priority. Componente controlado: recebe valor e callback de mudança.

- [ ] **Step 1: Test failing**

Criar `src/features/inbox/InboxFilters.test.tsx`:

```tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InboxFilters } from "./InboxFilters";

const noFilters = { search: "", status: "all" as const, priority: "all" as const };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("InboxFilters", () => {
  it("renderiza campo de busca, segmented e select", () => {
    render(<InboxFilters value={noFilters} onChange={() => {}} />);
    expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tudo/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("digitar na busca chama onChange com novo search", async () => {
    const onChange = vi.fn();
    render(<InboxFilters value={noFilters} onChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText(/buscar/i), "elev");
    // 4 keystrokes
    expect(onChange).toHaveBeenCalledTimes(4);
    expect(onChange).toHaveBeenLastCalledWith({ ...noFilters, search: "elev" });
  });

  it("clicar em 'Abertos' chama onChange com status=open", async () => {
    const onChange = vi.fn();
    render(<InboxFilters value={noFilters} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /abertos/i }));
    expect(onChange).toHaveBeenCalledWith({ ...noFilters, status: "open" });
  });

  it("trocar select chama onChange com priority", async () => {
    const onChange = vi.fn();
    render(<InboxFilters value={noFilters} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "high");
    expect(onChange).toHaveBeenCalledWith({ ...noFilters, priority: "high" });
  });

  it("destaca o segmented ativo", () => {
    render(<InboxFilters value={{ ...noFilters, status: "in_progress" }} onChange={() => {}} />);
    const btn = screen.getByRole("button", { name: /em andamento/i });
    expect(btn.className).toContain("active");
  });
});
```

- [ ] **Step 2: Run test, verificar falha**

Run: `npx vitest run src/features/inbox/InboxFilters.test.tsx`  
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: CSS**

Criar `src/features/inbox/InboxFilters.module.css`:

```css
.bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.search {
  flex: 1;
  min-width: 200px;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background-color: var(--bg-surface);
  color: var(--fg-primary);
  font-size: var(--fs-sm);
}

.search:focus {
  outline: none;
  border-color: var(--brand);
}

.seg {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.segBtn {
  background: var(--bg-surface);
  color: var(--fg-secondary);
  border: none;
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  font-size: var(--fs-sm);
  border-right: 1px solid var(--border);
}

.segBtn:last-child {
  border-right: none;
}

.segBtn:hover {
  background-color: var(--bg-muted);
}

.active {
  background-color: var(--brand);
  color: var(--fg-inverse);
}

.active:hover {
  background-color: var(--brand-hover);
}

.select {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background-color: var(--bg-surface);
  color: var(--fg-primary);
  font-size: var(--fs-sm);
}

@media (max-width: 767px) {
  .bar {
    flex-wrap: wrap;
  }

  .search {
    width: 100%;
    flex: 1 0 100%;
  }
}
```

- [ ] **Step 4: TSX**

Criar `src/features/inbox/InboxFilters.tsx`:

```tsx
import type { FilterState } from "./filterTickets";
import type { TicketStatus } from "@/ui/StatusBadge/StatusBadge";
import type { TicketPriority } from "@/ui/PriorityChip/PriorityChip";
import styles from "./InboxFilters.module.css";

interface InboxFiltersProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
}

const STATUS_OPTIONS: ReadonlyArray<{ value: FilterState["status"]; label: string }> = [
  { value: "all", label: "Tudo" },
  { value: "open", label: "Abertos" },
  { value: "in_progress", label: "Em andamento" },
];

const PRIORITY_OPTIONS: ReadonlyArray<{ value: FilterState["priority"]; label: string }> = [
  { value: "all", label: "Qualquer prioridade" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
];

export function InboxFilters({ value, onChange }: InboxFiltersProps) {
  return (
    <div className={styles.bar}>
      <input
        type="search"
        className={styles.search}
        placeholder="Buscar por título, protocolo ou morador…"
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
      />
      <div className={styles.seg} role="group" aria-label="Filtro por status">
        {STATUS_OPTIONS.map((o) => {
          const active = value.status === o.value;
          const cls = [styles.segBtn, active ? styles.active : ""].filter(Boolean).join(" ");
          return (
            <button
              key={o.value}
              type="button"
              className={cls}
              onClick={() => onChange({ ...value, status: o.value as TicketStatus | "all" })}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <select
        className={styles.select}
        value={value.priority}
        onChange={(e) => onChange({ ...value, priority: e.target.value as TicketPriority | "all" })}
      >
        {PRIORITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 5: Run test, verificar pass**

Run: `npx vitest run src/features/inbox/InboxFilters.test.tsx`  
Expected: PASS (5 tests).

- [ ] **Step 6: Typecheck + commit**

```bash
git add src/features/inbox/InboxFilters.tsx src/features/inbox/InboxFilters.module.css src/features/inbox/InboxFilters.test.tsx
git commit -m "feat(inbox): adiciona InboxFilters (search + segmented + select)"
```

---

### Task 15: Componente `InboxPage`

**Files:**

- Create: `src/features/inbox/InboxPage.tsx`
- Create: `src/features/inbox/InboxPage.module.css`
- Create: `src/features/inbox/InboxPage.test.tsx`

Componente da rota. Header (título + contagem), `InboxFilters` (state local), `InboxList` ou estados (loading/error/empty). Recebe `condoId` por param. Navegação para detalhe via `useNavigate`.

- [ ] **Step 1: Test failing**

Criar `src/features/inbox/InboxPage.test.tsx`:

```tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InboxPage } from "./InboxPage";
import * as inboxQuery from "./useInboxTickets";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

const mkTicket = (over: Partial<{ id: string; title: string; protocol: string }> = {}) => ({
  id: over.id ?? "t1",
  protocol: over.protocol ?? "TKT-2026-001",
  title: over.title ?? "Elevador parado",
  status: "open" as const,
  priority: "high" as const,
  updated_at: "2026-05-14T00:00:00Z",
});

afterEach(() => {
  vi.restoreAllMocks();
  mockNavigate.mockReset();
});

describe("InboxPage", () => {
  it("mostra skeleton em loading", () => {
    vi.spyOn(inboxQuery, "useInboxTickets").mockReturnValue({
      data: undefined,
      isPending: true,
      isFetching: true,
      isError: false,
      isSuccess: false,
      error: undefined,
      refetch: () => {},
    });
    render(<InboxPage condoId="c1" />);
    expect(screen.getByLabelText(/carregando/i)).toBeInTheDocument();
  });

  it("mostra empty 'Tudo em dia' quando não há tickets nem filtros", () => {
    vi.spyOn(inboxQuery, "useInboxTickets").mockReturnValue({
      data: [],
      isPending: false,
      isFetching: false,
      isError: false,
      isSuccess: true,
      error: undefined,
      refetch: () => {},
    });
    render(<InboxPage condoId="c1" />);
    expect(screen.getByText(/tudo em dia/i)).toBeInTheDocument();
  });

  it("mostra empty 'Nenhum chamado' quando filtros não retornam nada", async () => {
    vi.spyOn(inboxQuery, "useInboxTickets").mockReturnValue({
      data: [mkTicket({ title: "Elevador" })],
      isPending: false,
      isFetching: false,
      isError: false,
      isSuccess: true,
      error: undefined,
      refetch: () => {},
    });
    render(<InboxPage condoId="c1" />);
    await userEvent.type(screen.getByPlaceholderText(/buscar/i), "vazamento");
    expect(screen.getByText(/nenhum chamado/i)).toBeInTheDocument();
  });

  it("mostra erro com botão tentar novamente", async () => {
    const refetch = vi.fn();
    vi.spyOn(inboxQuery, "useInboxTickets").mockReturnValue({
      data: undefined,
      isPending: false,
      isFetching: false,
      isError: true,
      isSuccess: false,
      error: new Error("boom"),
      refetch,
    });
    render(<InboxPage condoId="c1" />);
    expect(screen.getByText(/não foi possível carregar/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("renderiza lista de tickets e click chama navigate", async () => {
    vi.spyOn(inboxQuery, "useInboxTickets").mockReturnValue({
      data: [mkTicket({ id: "t1", title: "Elevador" })],
      isPending: false,
      isFetching: false,
      isError: false,
      isSuccess: true,
      error: undefined,
      refetch: () => {},
    });
    render(<InboxPage condoId="c1" />);
    expect(screen.getByText("Elevador")).toBeInTheDocument();
    // tabela: row clickable
    await userEvent.click(screen.getByText("Elevador").closest("tr") as HTMLElement);
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/c/$condoId/inbox/$ticketId",
      params: { condoId: "c1", ticketId: "t1" },
    });
  });
});
```

- [ ] **Step 2: Run test, verificar falha**

Run: `npx vitest run src/features/inbox/InboxPage.test.tsx`  
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: CSS**

Criar `src/features/inbox/InboxPage.module.css`:

```css
.header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: var(--space-4);
  gap: var(--space-3);
}

.title {
  margin: 0;
  font-size: var(--fs-2xl);
  font-weight: var(--fw-semibold);
  color: var(--fg-primary);
}

.subtitle {
  margin-top: var(--space-1);
  font-size: var(--fs-sm);
  color: var(--fg-secondary);
}

.fetching {
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--brand), transparent);
  animation: indet 1.4s linear infinite;
  margin-bottom: var(--space-2);
}

@keyframes indet {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.error {
  text-align: center;
  padding: var(--space-8);
  color: var(--fg-secondary);
}

.error h2 {
  margin: 0 0 var(--space-2);
  font-size: var(--fs-lg);
  color: var(--fg-primary);
}

.error p {
  margin: 0 0 var(--space-4);
}
```

- [ ] **Step 4: TSX**

Criar `src/features/inbox/InboxPage.tsx`:

```tsx
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/ui/Button/Button";
import { Spinner } from "@/ui/Spinner/Spinner";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import { useInboxTickets } from "./useInboxTickets";
import { filterTickets, type FilterState } from "./filterTickets";
import { InboxFilters } from "./InboxFilters";
import { InboxList } from "./InboxList";
import styles from "./InboxPage.module.css";

interface InboxPageProps {
  condoId: string;
}

const DEFAULT_FILTERS: FilterState = { search: "", status: "all", priority: "all" };

export function InboxPage({ condoId }: InboxPageProps) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const navigate = useNavigate();
  const { data, isPending, isFetching, isError, refetch } = useInboxTickets(condoId);

  const filtered = useMemo(() => filterTickets(data ?? [], filters), [data, filters]);

  const handlePick = (ticketId: string) => {
    void navigate({
      to: "/c/$condoId/inbox/$ticketId",
      params: { condoId, ticketId },
    });
  };

  if (isPending) {
    return (
      <>
        <PageHeader count={undefined} />
        <Spinner />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader count={undefined} />
        <div className={styles.error}>
          <h2>Não foi possível carregar a inbox</h2>
          <p>Tente novamente em alguns segundos.</p>
          <Button onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      </>
    );
  }

  const hasActiveFilters =
    filters.search !== "" || filters.status !== "all" || filters.priority !== "all";

  return (
    <>
      <PageHeader count={filtered.length} />
      {isFetching && <div className={styles.fetching} />}
      <InboxFilters value={filters} onChange={setFilters} />
      {filtered.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            title="Nenhum chamado"
            description="Ajuste os filtros para ver outros tickets."
          />
        ) : (
          <EmptyState
            title="Tudo em dia"
            description="Nenhum chamado aberto ou em andamento neste condomínio."
          />
        )
      ) : (
        <InboxList tickets={filtered} onPick={handlePick} />
      )}
    </>
  );
}

function PageHeader({ count }: { count: number | undefined }) {
  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>Inbox</h1>
        <p className={styles.subtitle}>
          {count === undefined
            ? "Carregando…"
            : `${count} chamado${count === 1 ? "" : "s"} ativo${count === 1 ? "" : "s"}`}
        </p>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Run test, verificar pass**

Run: `npx vitest run src/features/inbox/InboxPage.test.tsx`  
Expected: PASS (5 tests).

> Se o teste de click em tr falhar com "closest is null" (porque RTL renderiza sem `<table>` parent), confirmar — o componente real renderiza `<table>` então o `<tr>` sempre tem ancestral. Em jsdom isso funciona.

- [ ] **Step 6: Typecheck + commit**

Run: `npm run typecheck && npm run lint`  
Expected: verde.

```bash
git add src/features/inbox/InboxPage.tsx src/features/inbox/InboxPage.module.css src/features/inbox/InboxPage.test.tsx
git commit -m "feat(inbox): adiciona InboxPage com header, filtros e estados"
```

---

### Task 16: Conectar `InboxPage` à rota

**Files:**

- Modify: `src/app/routes/_app/c/$condoId/inbox.tsx`
- Auto-update: `src/app/routeTree.gen.ts`

- [ ] **Step 1: Substituir conteúdo do route file**

Editar `src/app/routes/_app/c/$condoId/inbox.tsx`. Substituir todo o conteúdo por:

```tsx
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { InboxPage } from "@/features/inbox/InboxPage";

export const Route = createFileRoute("/_app/c/$condoId/inbox")({
  component: InboxRoute,
});

function InboxRoute() {
  const { condoId } = Route.useParams();
  return (
    <>
      <InboxPage condoId={condoId} />
      <Outlet />
    </>
  );
}
```

> **Por que `<Outlet/>`:** a sub-rota `/inbox/$ticketId` (Slice 4.3) renderiza dentro deste componente para que a `InboxPage` permaneça montada quando a modal abre.

- [ ] **Step 2: Rodar dev server e regenerar routeTree**

Run: `npm run dev`  
O plugin `TanStackRouterVite` regenera `src/app/routeTree.gen.ts` automaticamente. Esperar o log "Generated route tree" e parar o server (Ctrl+C).

- [ ] **Step 3: Rodar typecheck + tests**

Run: `npm run typecheck && npm run test`  
Expected: verde.

- [ ] **Step 4: Commit**

```bash
git add src/app/routes/_app/c/$condoId/inbox.tsx src/app/routeTree.gen.ts
git commit -m "feat(inbox): conecta InboxPage à rota /c/\$condoId/inbox"
```

---

### Task 17: Slice 4.2 — fechar PR

- [ ] **Step 1: Suite completa + build**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`  
Expected: tudo verde.

- [ ] **Step 2: Smoke manual rápido**

```bash
npm run dev
```

Abrir http://localhost:5173 → login → ir para `/c/<condoId>/inbox`. Verificar:

- Lista carrega tickets reais (precisa de tickets em staging — usar Supabase Studio ou criar via Core).
- Filtros funcionam (search, segmented, select).
- Após 30s, polling dispara nova requisição (Network tab).
- Mobile: redimensionar < 768px → cards aparecem, tabela some.
- Click num ticket: vai para 404 (esperado, sub-rota chega em 4.3).

Parar server (Ctrl+C).

- [ ] **Step 3: Push e abrir PR**

```bash
git push -u origin feature/plan-4-2-inbox-list
gh pr create --base develop --title "feat(plan-4): inbox list page com filtros e polling" --body "$(cat <<'EOF'
## Summary
- Substitui placeholder de `/c/$condoId/inbox` pela `InboxPage` real.
- Lista de tickets `open`+`in_progress`, filtros (search + segmented status + select priority), responsivo (tabela ≥768px, cards <768px).
- Polling de 30s e refetch on focus via `useInboxTickets`.
- Estados: loading (Spinner), erro (botão "Tentar novamente"), vazio (com/sem filtros).
- Click no ticket navega para `/inbox/$ticketId` (rota chega em 4.3 — clicar agora resulta em 404 esperado).

Spec: `docs/superpowers/specs/2026-05-13-plan-4-inbox-mvp-design.md`.

## Test plan
- [ ] CI verde.
- [ ] Smoke manual em preview Vercel: lista carrega tickets reais, filtros funcionam, polling atualiza após 30s.
- [ ] Mobile: redimensionar e ver cards.
- [ ] Empty states corretos.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

# Slice 4.3 — Ticket detail modal route

**Branch:** `feature/plan-4-3-detail-modal` (sair de `develop` atualizada com 4.2 mergeada)  
**PR:** contra `develop`  
**Escopo:** componente `TicketDetailModal` + arquivo de rota filha `inbox/$ticketId.tsx`. Acessibilidade: foco/Esc/click overlay já vem do `Modal` do Slice 4.1.

---

### Task 18: Componente `TicketDetailModal`

**Files:**

- Create: `src/features/inbox/TicketDetailModal.tsx`
- Create: `src/features/inbox/TicketDetailModal.module.css`
- Create: `src/features/inbox/TicketDetailModal.test.tsx`

Recebe `ticketId` + `condoId` + `onClose`. Internamente: chama `useTicket`, renderiza `Modal` com header (protocolo+título+badges), meta (morador/contato/localização/datas), descrição, placeholder Plan 5. Estados: loading (Spinner), erro 404 (mensagem + botão voltar), erro genérico (mensagem + tentar novamente).

- [ ] **Step 1: Test failing**

Criar `src/features/inbox/TicketDetailModal.test.tsx`:

```tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketDetailModal } from "./TicketDetailModal";
import * as ticketQuery from "./useTicket";

const mkTicket = () => ({
  id: "t1",
  protocol: "TKT-2026-00041",
  title: "Elevador parado no 8º andar",
  status: "in_progress" as const,
  priority: "high" as const,
  resident_name: "Mariana Costa",
  unit_number: "803",
  block_name: "Bloco A",
  description: "Elevador apresentou ruído estranho e parou de funcionar.",
  updated_at: "2026-05-14T12:00:00Z",
  created_at: "2026-05-14T08:00:00Z",
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TicketDetailModal", () => {
  it("mostra spinner em loading", () => {
    vi.spyOn(ticketQuery, "useTicket").mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      isSuccess: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof ticketQuery.useTicket>);
    render(<TicketDetailModal ticketId="t1" onClose={() => {}} />);
    expect(screen.getByLabelText(/carregando/i)).toBeInTheDocument();
  });

  it("renderiza protocolo, título, badges, descrição e placeholder", () => {
    vi.spyOn(ticketQuery, "useTicket").mockReturnValue({
      data: mkTicket(),
      isPending: false,
      isError: false,
      isSuccess: true,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof ticketQuery.useTicket>);
    render(<TicketDetailModal ticketId="t1" onClose={() => {}} />);
    expect(screen.getByText("TKT-2026-00041")).toBeInTheDocument();
    expect(screen.getByText("Elevador parado no 8º andar")).toBeInTheDocument();
    expect(screen.getByText("Em andamento")).toBeInTheDocument();
    expect(screen.getByText("Alta")).toBeInTheDocument();
    expect(screen.getByText(/elevador apresentou ruído/i)).toBeInTheDocument();
    expect(screen.getByText("Mariana Costa")).toBeInTheDocument();
    expect(screen.getByText(/comentários, atribuição/i)).toBeInTheDocument();
  });

  it("mostra mensagem 404 com botão voltar", async () => {
    const onClose = vi.fn();
    vi.spyOn(ticketQuery, "useTicket").mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      isSuccess: false,
      error: new Error("not found"),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof ticketQuery.useTicket>);
    render(<TicketDetailModal ticketId="zzz" onClose={onClose} />);
    expect(screen.getByText(/ticket não encontrado/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /voltar para inbox/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("Esc chama onClose", async () => {
    const onClose = vi.fn();
    vi.spyOn(ticketQuery, "useTicket").mockReturnValue({
      data: mkTicket(),
      isPending: false,
      isError: false,
      isSuccess: true,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof ticketQuery.useTicket>);
    render(<TicketDetailModal ticketId="t1" onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test, verificar falha**

Run: `npx vitest run src/features/inbox/TicketDetailModal.test.tsx`  
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: CSS**

Criar `src/features/inbox/TicketDetailModal.module.css`:

```css
.proto {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--fg-tertiary);
  margin-bottom: var(--space-2);
}

.badges {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-top: var(--space-3);
}

.meta {
  margin-top: var(--space-4);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  font-size: var(--fs-xs);
  color: var(--fg-tertiary);
}

.metaLabel {
  margin-right: var(--space-1);
}

.metaValue {
  color: var(--fg-secondary);
  font-weight: var(--fw-medium);
}

.section {
  margin-top: var(--space-5);
}

.sectionTitle {
  font-size: var(--fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-tertiary);
  font-weight: var(--fw-medium);
  margin-bottom: var(--space-2);
}

.description {
  font-size: var(--fs-sm);
  color: var(--fg-secondary);
  line-height: var(--lh-relaxed);
  padding: var(--space-3) var(--space-4);
  background-color: var(--bg-muted);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.empty {
  text-align: center;
  padding: var(--space-6);
  color: var(--fg-secondary);
}

.empty h3 {
  margin: 0 0 var(--space-2);
  font-size: var(--fs-base);
  color: var(--fg-primary);
}

.empty p {
  margin: 0 0 var(--space-4);
  font-size: var(--fs-sm);
}
```

- [ ] **Step 4: TSX**

Criar `src/features/inbox/TicketDetailModal.tsx`:

```tsx
import { Modal } from "@/ui/Modal/Modal";
import { Button } from "@/ui/Button/Button";
import { Spinner } from "@/ui/Spinner/Spinner";
import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { PriorityChip } from "@/ui/PriorityChip/PriorityChip";
import { useTicket } from "./useTicket";
import { formatRelTime } from "./formatRelTime";
import type { Ticket } from "./filterTickets";
import styles from "./TicketDetailModal.module.css";

interface TicketDetailModalProps {
  ticketId: string;
  onClose: () => void;
}

function locationLabel(t: Ticket): string {
  if (t.common_area_name) return t.common_area_name;
  if (t.block_name && t.unit_number) return `${t.block_name} · ${t.unit_number}`;
  if (t.unit_number) return t.unit_number;
  return "—";
}

function formatAbsolute(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TicketDetailModal({ ticketId, onClose }: TicketDetailModalProps) {
  const { data, isPending, isError, refetch } = useTicket(ticketId);

  if (isPending) {
    return (
      <Modal open={true} onClose={onClose} title="Carregando…">
        <div style={{ padding: "var(--space-6)", display: "grid", placeItems: "center" }}>
          <Spinner />
        </div>
      </Modal>
    );
  }

  if (isError || !data) {
    return (
      <Modal open={true} onClose={onClose} title="Ticket não encontrado">
        <div className={styles.empty}>
          <h3>Não conseguimos abrir esse ticket</h3>
          <p>Pode ter sido removido ou você não tem acesso a ele.</p>
          <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "center" }}>
            <Button variant="secondary" onClick={onClose}>
              Voltar para inbox
            </Button>
            <Button onClick={() => refetch()}>Tentar novamente</Button>
          </div>
        </div>
      </Modal>
    );
  }

  const created = data.created_at as string | undefined;

  return (
    <Modal open={true} onClose={onClose} title={data.title}>
      <div className={styles.proto}>{data.protocol}</div>
      <div className={styles.badges}>
        <StatusBadge status={data.status} />
        <PriorityChip priority={data.priority} />
      </div>
      <div className={styles.meta}>
        {data.resident_name && (
          <span>
            <span className={styles.metaLabel}>Morador:</span>
            <span className={styles.metaValue}>{data.resident_name}</span>
          </span>
        )}
        <span>
          <span className={styles.metaLabel}>Local:</span>
          <span className={styles.metaValue}>{locationLabel(data)}</span>
        </span>
        <span>
          <span className={styles.metaLabel}>Aberto em:</span>
          <span className={styles.metaValue}>{formatAbsolute(created)}</span>
        </span>
        <span>
          <span className={styles.metaLabel}>Atualizado:</span>
          <span className={styles.metaValue}>{formatRelTime(data.updated_at)}</span>
        </span>
      </div>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Descrição</div>
        <div className={styles.description}>{data.description ?? "Sem descrição."}</div>
      </div>
      <div className={styles.section}>
        <div className={styles.empty}>
          <p>Comentários, atribuição e mudança de status chegam no Plan 5.</p>
        </div>
      </div>
    </Modal>
  );
}
```

> **Nota sobre `description`:** o campo está em `TicketResponse` mas não está em `Ticket` (interface local). Atualizar `Ticket` na próxima micro-step.

- [ ] **Step 5: Acrescentar `description` e `created_at` ao tipo `Ticket`**

Editar `src/features/inbox/filterTickets.ts`. Adicionar os dois campos opcionais à interface `Ticket`:

```ts
export interface Ticket {
  id: string;
  protocol: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  resident_name?: string;
  unit_number?: string;
  block_name?: string;
  common_area_name?: string;
  description?: string;
  created_at?: string;
  updated_at: string;
}
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/features/inbox/`  
Expected: todos os testes passam (incluindo TicketDetailModal: 4 tests).

- [ ] **Step 7: Typecheck + commit**

```bash
git add src/features/inbox/TicketDetailModal.tsx src/features/inbox/TicketDetailModal.module.css src/features/inbox/TicketDetailModal.test.tsx src/features/inbox/filterTickets.ts
git commit -m "feat(inbox): adiciona TicketDetailModal read-only"
```

---

### Task 19: Criar rota filha `inbox/$ticketId.tsx`

**Files:**

- Create: `src/app/routes/_app/c/$condoId/inbox/$ticketId.tsx`
- Auto-update: `src/app/routeTree.gen.ts`

A rota filha renderiza a modal e fecha via navigate para `..`.

- [ ] **Step 1: Criar diretório**

```bash
mkdir -p src/app/routes/_app/c/\$condoId/inbox
```

- [ ] **Step 2: Criar arquivo de rota**

Criar `src/app/routes/_app/c/$condoId/inbox/$ticketId.tsx`:

```tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TicketDetailModal } from "@/features/inbox/TicketDetailModal";

export const Route = createFileRoute("/_app/c/$condoId/inbox/$ticketId")({
  component: TicketDetailRoute,
});

function TicketDetailRoute() {
  const { condoId, ticketId } = Route.useParams();
  const navigate = useNavigate();

  const handleClose = () => {
    void navigate({
      to: "/c/$condoId/inbox",
      params: { condoId },
    });
  };

  return <TicketDetailModal ticketId={ticketId} onClose={handleClose} />;
}
```

- [ ] **Step 3: Regenerar route tree**

Run: `npm run dev`  
Aguardar "Generated route tree" no log. Parar (Ctrl+C).

- [ ] **Step 4: Verificar typecheck e tests**

Run: `npm run typecheck && npm run test`  
Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add src/app/routes/_app/c/\$condoId/inbox/\$ticketId.tsx src/app/routeTree.gen.ts
git commit -m "feat(inbox): adiciona rota filha modal /inbox/\$ticketId"
```

---

### Task 20: Smoke manual end-to-end

- [ ] **Step 1: Rodar dev server**

```bash
npm run dev
```

- [ ] **Step 2: Validar fluxo no browser**

Abrir http://localhost:5173 → login com usuário super admin → ir para `/c/<condoId>/inbox`.

Cobrir:

- [ ] Lista de tickets ativos aparece (a estrutura de tickets de teste depende do staging — criar 2-3 via Core se necessário, ou alterar o filtro `status` no SQL Editor para deixar alguns como `open`/`in_progress`).
- [ ] Click num ticket → URL muda para `/inbox/$ticketId`, modal abre sobre a lista (lista visível atrás).
- [ ] Esc fecha modal, URL volta para `/inbox`.
- [ ] Click no overlay fecha modal.
- [ ] Click no botão X fecha modal.
- [ ] Refresh em `/inbox/$ticketId` → reabre modal sobre a lista.
- [ ] Mobile (DevTools < 768px): modal em tela cheia.
- [ ] Tab navega dentro da modal (foco trapeado).

Parar server.

---

### Task 21: Slice 4.3 — fechar PR

- [ ] **Step 1: Suite completa**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`  
Expected: verde.

- [ ] **Step 2: Push e abrir PR**

```bash
git push -u origin feature/plan-4-3-detail-modal
gh pr create --base develop --title "feat(plan-4): ticket detail modal route" --body "$(cat <<'EOF'
## Summary
- Cria rota filha `/c/$condoId/inbox/$ticketId` em apresentação modal.
- `TicketDetailModal` read-only: protocolo, título, status, prioridade, morador, local, datas, descrição.
- Placeholder na base avisando que ações chegam no Plan 5.
- Acessibilidade via `Modal` (Radix Dialog): foco trap, Esc, click overlay.
- Mobile: modal em tela cheia.

Spec: `docs/superpowers/specs/2026-05-13-plan-4-inbox-mvp-design.md`.

## Test plan
- [ ] CI verde.
- [ ] Refresh em `/inbox/$ticketId` reabre modal sobre a lista.
- [ ] Esc, click overlay, botão X fecham.
- [ ] Mobile fullscreen.
- [ ] Erro 404 mostra mensagem + botão voltar.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

# Critério de pronto do Plan 4

Após os 3 PRs mergeados em `develop`:

- [ ] Preview Vercel verde com `develop` atualizada.
- [ ] Smoke manual no preview com user super admin:
  - [ ] Login → Inbox carrega tickets `open` + `in_progress` do condo ativo.
  - [ ] Segmented `Tudo / Abertos / Em andamento` filtra. Search por protocolo/título/morador funciona.
  - [ ] Polling: criar ticket no Core via curl, esperar 30s, lista atualiza sozinha.
  - [ ] Click num ticket → URL muda, modal abre. Refresh mantém modal. Esc fecha. Mobile = tela cheia.
  - [ ] Empty states corretos (sem tickets / sem matches).
- [ ] Atualizar `CLAUDE.md` com lições de review surgidas durante o Plan 4 (seção "Padrões e convenções").

---

# Self-review

Coberturas vs spec:

- ✅ Spec §Inclui · "Inbox = fila de tickets `open`+`in_progress`": Tasks 7 + 15 + 16
- ✅ Spec §Inclui · "Filtros (busca, segmented, dropdown)": Tasks 6 + 14
- ✅ Spec §Inclui · "Ordenação prioridade desc + updated_at desc": Task 6 (`filterTickets`)
- ✅ Spec §Inclui · "Polling 30s + refetch on focus": Task 7
- ✅ Spec §Inclui · "Rota dedicada modal `/inbox/$ticketId`": Tasks 18 + 19
- ✅ Spec §Inclui · "Detalhe read-only com placeholder Plan 5": Task 18
- ✅ Spec §Inclui · "Responsivo cards mobile + tabela desktop": Tasks 11 + 12 + 13
- ✅ Spec §Inclui · "Tokens semânticos novos": Task 1
- ✅ Spec §Inclui · "StatusBadge, PriorityChip, Modal em src/ui/": Tasks 3 + 4 + 5
- ✅ Spec §Componentes (todos os arquivos listados): Tasks 11–18
- ✅ Spec §Estados (loading, polling, erro, vazio com/sem filtros, modal loading/404): Tasks 15 + 18
- ✅ Spec §Mobile (< 768px): Tasks 12 + 13 + 14 (CSS) + 18 (CSS Modal)
- ✅ Spec §Estilo (tokens, IBM Plex via Plan 2, sem cor crua): Tasks 1 + cada CSS
- ✅ Spec §Testes (filterTickets, useInboxTickets, InboxFilters, InboxPage, TicketDetailModal): Tasks 6 + 7 + 14 + 15 + 18
- ✅ Spec §Fatiamento (4.1, 4.2, 4.3): Tasks 1–9, 10–17, 18–21

Notas:

- Task 10 ficou skip (decisão de não compartilhar `TicketRow` polimórfico). Numeração das tasks subsequentes mantida para não embaralhar referências.
- `useTicket.ts` cobre `TicketResponse` que tem `description` e `created_at` opcionais — Task 18 estende a interface `Ticket` para refletir.
- `TicketRow.test.tsx` removido do escopo (não há `TicketRow` único). Cobertura de click vem do `InboxPage.test.tsx` (Task 15).
