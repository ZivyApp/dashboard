# Plan 5 — Redesign shell + Activity Feed unificado

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o shell atual (Header + Sidebar simples) por Topbar + Sidebar agrupada, introduzir escopo "Todos os condomínios" cross-condo, e reescrever a Inbox como Activity Feed unificado consumindo um `ActivityRepository` local (mock-first), preparando troca para HTTP quando o Core entregar o endpoint.

**Architecture:** Quatro slices independentes contra `develop`. Slice 5.1 entrega o shell visual + rotas placeholder (sem dados). Slice 5.2 entrega o `ActivityRepository` (interface + adapter local com fixtures) e os componentes do feed plugados em `/inbox` e `/c/$id/inbox`. Slice 5.3 aplica `useRoleGuard` nas rotas novas e ajusta visibilidade da sidebar conforme role/scope. Slice 5.4 adiciona `HttpActivityRepository` atrás de flag `VITE_ACTIVITY_REPOSITORY=http`, default `local`.

**Tech Stack:** Vite 5, React 19, TanStack Router (file-based), TanStack Query, Zustand, Radix Dialog/DropdownMenu, lucide-react 1.14, CSS Modules + design tokens, Vitest + Testing Library, Storybook 8.

---

## Handoff (ground truth)

O design oficial está vendorado em `docs/handoff/zivy-wa-green/`. Antes de cada task que toca em visual, **abrir o arquivo correspondente do handoff e usar como referência canônica**:

| Pergunta                                                          | Onde olhar                                                                                                                         |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Paleta de cores (WhatsApp Green)                                  | `docs/handoff/zivy-wa-green/project/theme-wa-green.css` (33 linhas — overrides brand + neutros)                                    |
| Tokens base (status, info, danger, fs, space, radius, size)       | `docs/handoff/zivy-wa-green/project/styles.css:1–105` (`:root` block)                                                              |
| Anatomia da Topbar (logo, condo-switcher, search, persona-badge)  | `chrome.jsx` + classes `.header`, `.logo`, `.condo-switcher`, `.search-bar`, `.persona-badge` em `styles.css:188–270`              |
| Anatomia da Sidebar (scope header, nav-section, nav-item, footer) | `chrome.jsx` + classes `.scope`, `.nav-section`, `.nav-item`, `.nav-count`, `.nav-dot`, `.sidebar .footer` em `styles.css:272–326` |
| Inbox/feed item (`.inbox-item`) + tabs (`.seg`)                   | `src/page-inbox.jsx` + `styles.css:706–720` (item) e bloco `.seg`                                                                  |
| Shape de dados (eventos do feed)                                  | `data.jsx` + `KIND_ICON` em `page-inbox.jsx:15–20`                                                                                 |

**Princípio:** o handoff é HTML/CSS/JSX puro; nosso job é portar para o stack real (TanStack Router + CSS Modules + R19) preservando o **resultado visual e o vocabulário de tokens**, não a estrutura interna do protótipo.

### Deltas críticos vs o screenshot original (que motivou este plano)

1. **Tokens reais:** o handoff usa `--brand: #25D366` + neutros tinta verde. Status tokens (`--status-urgent-*`, `--info-*`, `--danger-*`) já existem em `src/design-tokens/colors.css` com os mesmos valores. **Não criar tokens `--activity-bar-*` novos** — Task 1 vira "atualizar brand/neutros para WA Green".
2. **`ActivityKind` real:** handoff usa `ticket_new | ticket_comment | approval | status_change`. Urgência é `priority` no ticket. Plano original tinha `ticket_new` como kind — **descartado**. Refletido nas Tasks 16, 17, 22.
3. **`ActivityEvent` shape:** mantemos `readAt: string | null` (mais expressivo que `unread: boolean`), mas adicionamos `avatar?: string` (iniciais 2 chars usadas em `.ii-icon`) e `ticketId?: string` opcional para display do protocolo no `.ii-sub`. Detalhado em Task 16.
4. **Classes CSS:** o handoff define classes globais (`.inbox-item`, `.scope`, `.nav-item`, `.seg`). Nossos componentes em CSS Modules **escopam** o mesmo visual (cada `.module.css` recria os estilos). Tasks de componente apontam para a classe-fonte.
5. **SidebarFooter:** handoff tem versão **e** ícone de settings + tema toggle no footer. Task 6 ajustada para incluir.
6. **SearchBox:** handoff inclui kbd hint `⌘K` à direita do input. Task 9 ajustada.

---

## Convenções (lembretes obrigatórios — todas as tasks)

- **Branches:** sair sempre de `develop` atualizada. `feature/plan-5-1-shell`, `feature/plan-5-2-activity-feed`, `feature/plan-5-3-role-guards`, `feature/plan-5-4-http-adapter`.
- **TDD onde aplicável:** componentes com lógica (`useScope`, `LocalActivityRepository`, `useActivityFeed`, `useMarkRead`, `ActivityFeed`, `ActivityItem`, `Sidebar*` com estado) entram com teste falhando primeiro. Componentes puramente apresentacionais (`SidebarFooter`, `RoleBadge`) podem entrar sem teste dedicado — Storybook cobre.
- **Commits frequentes:** uma feature por commit; um teste passando antes do commit.
- **TypeScript strict:** `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` ativos. Acessos a array/record tratam `undefined`; props opcionais omitem a chave em vez de `prop: undefined`.
- **Tokens semânticos:** cores via CSS custom properties já registradas em `src/design-tokens/`. Tokens novos para activity vivem em `src/design-tokens/semantic.css` (adicionar, não inline).
- **CSS Modules:** prefixar classes acessadas por variant com `Record<Variant, string>` + fallback `?? ""` para satisfazer `noUncheckedIndexedAccess`.
- **`type="button"`:** todos os botões dentro de qualquer wrapper que possa estar em form.
- **`safeStorage()`:** usar o helper de `src/stores/theme.ts` (ou criar irmão em `src/lib/safeStorage.ts` se for muito acessado) para qualquer escrita em `localStorage` — Safari Private Browsing lança `SecurityError`.
- **Mocks env-bound:** módulos que importam `@/api/client` ou `@/lib/env` recebem `vi.mock` com `vi.hoisted` em testes. Não usar `vi.spyOn` nesses casos (já documentado no CLAUDE.md, lição do Plan 4).
- **routeTree.gen.ts:** gerado pelo plugin Vite do TanStack Router. **Commitar** quando muda (rotas novas), mas não editar à mão. Vai aparecer no diff dos PRs 5.1, 5.2 e 5.3.

---

## File structure (visão consolidada)

```
src/
├── features/
│   ├── scope/                       # NOVO
│   │   ├── useScope.ts
│   │   └── useScope.test.ts
│   ├── activity/                    # NOVO (Slice 5.2/5.4)
│   │   ├── repository/
│   │   │   ├── types.ts             # ActivityKind, ActivityEvent, ActivityRepository
│   │   │   ├── local.ts             # LocalActivityRepository
│   │   │   ├── local.test.ts
│   │   │   ├── http.ts              # HttpActivityRepository (5.4)
│   │   │   ├── http.test.ts         # (5.4)
│   │   │   ├── fixtures.ts          # dados determinísticos
│   │   │   └── index.ts             # factory por env
│   │   ├── RepositoryProvider.tsx
│   │   ├── useActivityRepository.ts
│   │   ├── useActivityFeed.ts
│   │   ├── useActivityFeed.test.tsx
│   │   ├── useMarkRead.ts
│   │   ├── useMarkRead.test.tsx
│   │   ├── ActivityFeed.tsx
│   │   ├── ActivityFeed.module.css
│   │   ├── ActivityFeed.test.tsx
│   │   ├── ActivityFeedTabs.tsx
│   │   ├── ActivityFeedTabs.module.css
│   │   ├── ActivityFeedTabs.test.tsx
│   │   ├── ActivityItem.tsx
│   │   ├── ActivityItem.module.css
│   │   ├── ActivityItem.test.tsx
│   │   ├── activityIcon.ts
│   │   └── activityPalette.ts
│   └── condo/
│       └── CondoSwitcher.tsx        # ADAPTADO em 5.1 — adiciona item "Todos"
├── ui/AppShell/
│   ├── AppShell.tsx                 # REESCRITO — compõe Topbar + Sidebar + main
│   ├── AppShell.module.css          # AJUSTADO — grid 2 cols + topbar
│   ├── Topbar/                      # NOVO
│   │   ├── Topbar.tsx
│   │   ├── Topbar.module.css
│   │   ├── Topbar.test.tsx
│   │   ├── SearchBox.tsx
│   │   └── SearchBox.module.css
│   ├── Sidebar/                     # NOVO (substitui Sidebar.tsx velha)
│   │   ├── Sidebar.tsx
│   │   ├── Sidebar.module.css
│   │   ├── Sidebar.test.tsx
│   │   ├── SidebarHeader.tsx
│   │   ├── SidebarHeader.module.css
│   │   ├── SidebarGroup.tsx
│   │   ├── SidebarGroup.module.css
│   │   ├── SidebarItem.tsx
│   │   ├── SidebarItem.module.css
│   │   ├── SidebarItem.test.tsx
│   │   └── SidebarFooter.tsx
│   ├── RoleBadge.tsx                # NOVO
│   ├── RoleBadge.module.css
│   ├── Header.tsx                   # REMOVIDO em 5.1 (Topbar substitui)
│   └── (Sidebar.tsx antigo)         # REMOVIDO em 5.1
├── lib/
│   └── env.ts                       # AJUSTADO — adiciona ACTIVITY_REPOSITORY (5.4)
├── design-tokens/
│   └── semantic.css                 # AJUSTADO — adiciona tokens de activity (priority/kind)
└── app/routes/_app/
    ├── inbox.tsx                    # NOVO (5.1) — placeholder; (5.2) renderiza ActivityFeed
    ├── tickets.tsx                  # NOVO (5.1) — placeholder
    ├── approvals.tsx                # NOVO (5.1) — placeholder; (5.3) guard
    └── c/$condoId/
        └── structure/
            ├── blocks.tsx           # NOVO (5.1) — placeholder; (5.3) guard
            ├── units.tsx            # NOVO (5.1) — placeholder
            └── common-areas.tsx     # NOVO (5.1) — placeholder
```

---

# Slice 5.1 — Shell visual novo

**Branch:** `feature/plan-5-1-shell` (sair de `develop` atualizada)
**PR:** contra `develop`
**Escopo:** Topbar + Sidebar agrupada, `useScope`, `CondoSwitcher` com "Todos", rotas placeholder, remover `Header` e `Sidebar` antigos. Nenhuma mudança de dados — Inbox 4.2 continua funcionando em `/c/$id/inbox`.

---

### Task 1: Atualizar paleta de cores para WhatsApp Green (theme do handoff)

**Files:**

- Modify: `src/design-tokens/colors.css`

Sobrescrever brand + neutros para os valores do handoff (`docs/handoff/zivy-wa-green/project/theme-wa-green.css`). Os tokens de **status, danger, info, warning** já estão alinhados (mesmos hex em ambos). Não criar tokens `--activity-bar-*` — o feed consome `--info-*`, `--status-*`, `--brand-soft` diretamente.

- [ ] **Step 1: Editar `src/design-tokens/colors.css` no bloco `:root`**

Trocar os valores das chaves abaixo (manter o resto intacto):

```css
:root {
  --brand: #25d366;
  --brand-hover: #1db954;
  --brand-soft: #e8faf0;
  --brand-muted: #a7f3c8;
  --bg-canvas: #f4f6f4;
  --bg-surface: #ffffff;
  --bg-sidebar: #f7f9f8;
  --bg-muted: #edf2ee;
  --bg-elevated: #ffffff;
  --border: #dde8de;
  --border-strong: #c5d3c6;
  --fg-primary: #0a1f10;
  --fg-secondary: #3d6147;
  --fg-tertiary: #7ea688;
  --fg-disabled: #b8d4bc;
  --success: #25d366;
  /* status-*, danger-*, info-*, warning-*, ticket-*, fg-inverse, overlay-bg → SEM alteração */
}
```

- [ ] **Step 2: Adicionar `--shadow-focus` no fim do bloco `:root`**

```css
/* stylelint-disable-next-line declaration-strict-value */
--shadow-focus: 0 0 0 3px rgb(37 211 102 / 28%);
```

- [ ] **Step 3: Atualizar bloco `[data-theme="dark"]` com forest night**

Trocar os mesmos campos para os valores do handoff:

```css
--brand: #4ade80;
--brand-hover: #86efac;
--brand-soft: #14532d;
--brand-muted: #166534;
--bg-canvas: #0a1410;
--bg-surface: #111a13;
--bg-sidebar: #0a1410;
--bg-muted: #152018;
--bg-elevated: #1a2a1c;
--border: #1e3322;
--border-strong: #264d2c;
--fg-primary: #f0faf2;
--fg-secondary: #8fb89a;
--fg-tertiary: #5a7a62;
--fg-disabled: #2a4530;
--fg-inverse: #0a1410;
--success: #4ade80;
```

E adicionar:

```css
/* stylelint-disable-next-line declaration-strict-value */
--shadow-focus: 0 0 0 3px rgb(74 222 128 / 40%);
```

- [ ] **Step 4: Typecheck + smoke visual**

Run: `npm run typecheck`
Run: `npm run dev` — abrir a tela de login (que já existe) e validar visualmente que a cor do botão "Entrar" mudou do teal antigo para o WA Green. Parar.

- [ ] **Step 5: Commit**

```bash
git add src/design-tokens/colors.css
git commit -m "feat(tokens): adota paleta WhatsApp Green do handoff"
```

---

### Task 2: Hook `useScope`

**Files:**

- Create: `src/features/scope/useScope.ts`
- Create: `src/features/scope/useScope.test.ts`

Hook puro que deriva o escopo da URL via `useParams({ strict: false })` do TanStack Router.

- [ ] **Step 1: Test failing**

Criar `src/features/scope/useScope.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { useScope } from "./useScope";

vi.mock("@tanstack/react-router", () => ({
  useParams: vi.fn(),
}));

import { useParams } from "@tanstack/react-router";

describe("useScope", () => {
  it("retorna scope condo quando rota tem condoId", () => {
    vi.mocked(useParams).mockReturnValue({ condoId: "c1" });
    expect(useScope()).toEqual({ kind: "condo", condoId: "c1" });
  });

  it("retorna scope all quando rota não tem condoId", () => {
    vi.mocked(useParams).mockReturnValue({});
    expect(useScope()).toEqual({ kind: "all" });
  });

  it("retorna scope all quando condoId não é string", () => {
    vi.mocked(useParams).mockReturnValue({ condoId: undefined });
    expect(useScope()).toEqual({ kind: "all" });
  });
});
```

- [ ] **Step 2: Run, verificar falha**

Run: `npx vitest run src/features/scope/useScope.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementação**

Criar `src/features/scope/useScope.ts`:

```ts
import { useParams } from "@tanstack/react-router";

export type Scope = { kind: "all" } | { kind: "condo"; condoId: string };

export function useScope(): Scope {
  const params = useParams({ strict: false }) as { condoId?: string };
  if (typeof params.condoId === "string" && params.condoId.length > 0) {
    return { kind: "condo", condoId: params.condoId };
  }
  return { kind: "all" };
}
```

- [ ] **Step 4: Run, verificar pass**

Run: `npx vitest run src/features/scope/useScope.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/scope/useScope.ts src/features/scope/useScope.test.ts
git commit -m "feat(scope): hook useScope deriva escopo da URL"
```

---

### Task 3: `SidebarItem` (presentational)

**Files:**

- Create: `src/ui/AppShell/Sidebar/SidebarItem.tsx`
- Create: `src/ui/AppShell/Sidebar/SidebarItem.module.css`
- Create: `src/ui/AppShell/Sidebar/SidebarItem.test.tsx`

Item da sidebar: ícone + label + badge opcional. Active state via prop `active` (Sidebar.tsx decide). Renderiza como `<a>` quando recebe `to`, ou `<button>` quando recebe `onClick`.

- [ ] **Step 1: Test failing**

Criar `src/ui/AppShell/Sidebar/SidebarItem.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inbox } from "lucide-react";
import { SidebarItem } from "./SidebarItem";

describe("SidebarItem", () => {
  it("renderiza label e ícone", () => {
    render(<SidebarItem icon={Inbox} label="Inbox" />);
    expect(screen.getByText("Inbox")).toBeInTheDocument();
  });

  it("renderiza badge quando count > 0", () => {
    render(<SidebarItem icon={Inbox} label="Inbox" badge={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("não renderiza badge quando count = 0", () => {
    render(<SidebarItem icon={Inbox} label="Inbox" badge={0} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("aplica classe active quando active", () => {
    render(<SidebarItem icon={Inbox} label="Inbox" active />);
    const link = screen.getByText("Inbox").closest("a, button");
    expect(link?.className).toContain("active");
  });

  it("dispara onClick quando clicado", async () => {
    const onClick = vi.fn();
    render(<SidebarItem icon={Inbox} label="Inbox" onClick={onClick} />);
    await userEvent.click(screen.getByText("Inbox"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run, verificar falha**

Run: `npx vitest run src/ui/AppShell/Sidebar/SidebarItem.test.tsx`
Expected: FAIL.

- [ ] **Step 3: CSS**

Criar `src/ui/AppShell/Sidebar/SidebarItem.module.css`:

```css
.item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  color: var(--fg-secondary);
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font: inherit;
  font-size: var(--fs-sm);
  text-decoration: none;
  transition:
    background-color var(--duration-fast) var(--easing-standard),
    color var(--duration-fast) var(--easing-standard);
}

.item:hover {
  background-color: var(--sidebar-item-bg-hover);
  color: var(--fg-primary);
}

.active {
  background-color: var(--sidebar-item-bg-active);
  color: var(--sidebar-item-fg-active);
  font-weight: var(--fw-medium);
}

.icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.label {
  flex: 1;
}

.badge {
  flex-shrink: 0;
  background-color: var(--sidebar-badge-bg);
  color: var(--sidebar-badge-fg);
  font-size: var(--fs-xs);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 4: TSX**

Criar `src/ui/AppShell/Sidebar/SidebarItem.tsx`:

```tsx
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./SidebarItem.module.css";

interface SidebarItemProps {
  icon: LucideIcon;
  label: ReactNode;
  badge?: number;
  active?: boolean;
  onClick?: () => void;
  href?: string;
}

export function SidebarItem({ icon: Icon, label, badge, active, onClick, href }: SidebarItemProps) {
  const cls = [styles.item, active ? styles.active : ""].filter(Boolean).join(" ");
  const content = (
    <>
      <Icon className={styles.icon} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
      {typeof badge === "number" && badge > 0 ? (
        <span className={styles.badge}>{badge}</span>
      ) : null}
    </>
  );
  if (href) {
    return (
      <a className={cls} href={href} onClick={onClick}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {content}
    </button>
  );
}
```

- [ ] **Step 5: Run, verificar pass**

Run: `npx vitest run src/ui/AppShell/Sidebar/SidebarItem.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/ui/AppShell/Sidebar/SidebarItem.tsx src/ui/AppShell/Sidebar/SidebarItem.module.css src/ui/AppShell/Sidebar/SidebarItem.test.tsx
git commit -m "feat(shell): adiciona SidebarItem"
```

---

### Task 4: `SidebarGroup` (presentational)

**Files:**

- Create: `src/ui/AppShell/Sidebar/SidebarGroup.tsx`
- Create: `src/ui/AppShell/Sidebar/SidebarGroup.module.css`

Grupo: label uppercase + container de items.

- [ ] **Step 1: CSS**

Criar `src/ui/AppShell/Sidebar/SidebarGroup.module.css`:

```css
.group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-5);
}

.label {
  font-size: 11px;
  font-weight: var(--fw-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--sidebar-group-label);
  padding: 0 var(--space-3);
  margin-bottom: var(--space-1);
}

.items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
```

- [ ] **Step 2: TSX**

Criar `src/ui/AppShell/Sidebar/SidebarGroup.tsx`:

```tsx
import type { ReactNode } from "react";
import styles from "./SidebarGroup.module.css";

interface SidebarGroupProps {
  label: string;
  children: ReactNode;
}

export function SidebarGroup({ label, children }: SidebarGroupProps) {
  return (
    <div className={styles.group}>
      <div className={styles.label}>{label}</div>
      <div className={styles.items}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add src/ui/AppShell/Sidebar/SidebarGroup.tsx src/ui/AppShell/Sidebar/SidebarGroup.module.css
git commit -m "feat(shell): adiciona SidebarGroup"
```

---

### Task 5: `SidebarHeader` (bloco ESCOPO)

**Files:**

- Create: `src/ui/AppShell/Sidebar/SidebarHeader.tsx`
- Create: `src/ui/AppShell/Sidebar/SidebarHeader.module.css`

Header da sidebar: label "ESCOPO" + título do scope + subtítulo metadata. Recebe `title` e `subtitle` como props (Sidebar.tsx calcula).

- [ ] **Step 1: CSS**

Criar `src/ui/AppShell/Sidebar/SidebarHeader.module.css`:

```css
.header {
  padding: var(--space-3);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--space-4);
}

.label {
  font-size: 11px;
  font-weight: var(--fw-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--sidebar-group-label);
  margin-bottom: var(--space-2);
}

.title {
  font-size: var(--fs-base);
  font-weight: var(--fw-medium);
  color: var(--fg-primary);
  margin-bottom: var(--space-1);
}

.subtitle {
  font-size: var(--fs-xs);
  color: var(--fg-tertiary);
}
```

- [ ] **Step 2: TSX**

Criar `src/ui/AppShell/Sidebar/SidebarHeader.tsx`:

```tsx
import styles from "./SidebarHeader.module.css";

interface SidebarHeaderProps {
  title: string;
  subtitle?: string;
}

export function SidebarHeader({ title, subtitle }: SidebarHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.label}>Escopo</div>
      <div className={styles.title}>{title}</div>
      {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/AppShell/Sidebar/SidebarHeader.tsx src/ui/AppShell/Sidebar/SidebarHeader.module.css
git commit -m "feat(shell): adiciona SidebarHeader"
```

---

### Task 6: `SidebarFooter`

**Files:**

- Create: `src/ui/AppShell/Sidebar/SidebarFooter.tsx`

Footer simples: versão + branch. Versão pega de `package.json` via `__APP_VERSION__` injetado pelo Vite (passa a definir em `vite.config.ts` se ainda não existe — verificar).

- [ ] **Step 1: Verificar `vite.config.ts` para definir versão**

Run: `grep -n "__APP_VERSION__\|define:" vite.config.ts`

Se não existir define, adicionar:

```ts
// vite.config.ts (no objeto retornado por defineConfig)
define: {
  __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.0.0"),
  __APP_BRANCH__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_REF ?? "develop"),
},
```

E em `vite-env.d.ts` (`src/vite-env.d.ts`), declarar:

```ts
declare const __APP_VERSION__: string;
declare const __APP_BRANCH__: string;
```

- [ ] **Step 2: TSX inline com CSS**

Criar `src/ui/AppShell/Sidebar/SidebarFooter.tsx`:

```tsx
export function SidebarFooter() {
  return (
    <div
      style={{
        padding: "var(--space-3)",
        borderTop: "1px solid var(--border)",
        fontSize: "var(--fs-xs)",
        color: "var(--fg-tertiary)",
        marginTop: "auto",
      }}
    >
      v{__APP_VERSION__} · {__APP_BRANCH__}
    </div>
  );
}
```

> CSS inline aceitável aqui porque o componente é trivial (single-purpose, sem variantes). Não criar `.module.css`.

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add src/ui/AppShell/Sidebar/SidebarFooter.tsx vite.config.ts src/vite-env.d.ts
git commit -m "feat(shell): adiciona SidebarFooter com versão/branch"
```

---

### Task 7: `Sidebar` (composição + lógica de scope/active)

**Files:**

- Create: `src/ui/AppShell/Sidebar/Sidebar.tsx`
- Create: `src/ui/AppShell/Sidebar/Sidebar.module.css`
- Create: `src/ui/AppShell/Sidebar/Sidebar.test.tsx`

Composição: `SidebarHeader` + grupos OPERAÇÃO (sempre) e ESTRUTURA (só quando `scope.kind === "condo"`) + `SidebarFooter`. Item ativo é determinado por matching do path atual com a rota do item.

Importações: ícones `Inbox`, `Ticket`, `CheckCircle2`, `Settings`, `Building2`, `Home`, `Trees` de `lucide-react`.

- [ ] **Step 1: Test failing**

Criar `src/ui/AppShell/Sidebar/Sidebar.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
    <a {...(rest as Record<string, string>)}>{children}</a>
  ),
  useRouterState: () => ({ location: { pathname: "/inbox" } }),
}));

describe("Sidebar", () => {
  it("renderiza grupo OPERAÇÃO sempre", () => {
    render(<Sidebar scope={{ kind: "all" }} scopeTitle="Todos os condomínios" />);
    expect(screen.getByText(/Opera/i)).toBeInTheDocument();
    expect(screen.getByText("Inbox")).toBeInTheDocument();
  });

  it("omite ESTRUTURA quando scope é 'all'", () => {
    render(<Sidebar scope={{ kind: "all" }} scopeTitle="Todos os condomínios" />);
    expect(screen.queryByText(/Estrutura/i)).not.toBeInTheDocument();
  });

  it("mostra ESTRUTURA quando scope é 'condo'", () => {
    render(<Sidebar scope={{ kind: "condo", condoId: "c1" }} scopeTitle="Cond Y" />);
    expect(screen.getByText(/Estrutura/i)).toBeInTheDocument();
    expect(screen.getByText(/Blocos/i)).toBeInTheDocument();
  });

  it("renderiza header com title e subtitle", () => {
    render(
      <Sidebar
        scope={{ kind: "all" }}
        scopeTitle="Todos os condomínios"
        scopeSubtitle="5 condos · 488 unidades"
      />,
    );
    expect(screen.getByText("Todos os condomínios")).toBeInTheDocument();
    expect(screen.getByText("5 condos · 488 unidades")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, verificar falha**

Run: `npx vitest run src/ui/AppShell/Sidebar/Sidebar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: CSS**

Criar `src/ui/AppShell/Sidebar/Sidebar.module.css`:

```css
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-surface);
  border-right: 1px solid var(--border);
  padding: var(--space-3) var(--space-2);
  width: 240px;
  flex-shrink: 0;
}

.groups {
  flex: 1;
  overflow-y: auto;
}
```

- [ ] **Step 4: TSX**

Criar `src/ui/AppShell/Sidebar/Sidebar.tsx`:

```tsx
import { Link, useRouterState } from "@tanstack/react-router";
import { Inbox, Ticket, CheckCircle2, Settings, Building2, Home, Trees } from "lucide-react";
import type { Scope } from "@/features/scope/useScope";
import { SidebarGroup } from "./SidebarGroup";
import { SidebarItem } from "./SidebarItem";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarFooter } from "./SidebarFooter";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  scope: Scope;
  scopeTitle: string;
  scopeSubtitle?: string;
  inboxUnreadCount?: number;
  approvalsCount?: number;
}

interface Item {
  to: string;
  params?: Record<string, string>;
  label: string;
  icon: typeof Inbox;
  badge?: number;
}

export function Sidebar({
  scope,
  scopeTitle,
  scopeSubtitle,
  inboxUnreadCount,
  approvalsCount,
}: SidebarProps) {
  const { location } = useRouterState();
  const operacao: Item[] =
    scope.kind === "condo"
      ? [
          {
            to: "/c/$condoId/inbox",
            params: { condoId: scope.condoId },
            label: "Inbox",
            icon: Inbox,
            ...(typeof inboxUnreadCount === "number" ? { badge: inboxUnreadCount } : {}),
          },
          {
            to: "/c/$condoId/tickets",
            params: { condoId: scope.condoId },
            label: "Tickets",
            icon: Ticket,
          },
          {
            to: "/c/$condoId/approvals",
            params: { condoId: scope.condoId },
            label: "Aprovações",
            icon: CheckCircle2,
            ...(typeof approvalsCount === "number" ? { badge: approvalsCount } : {}),
          },
          {
            to: "/c/$condoId/settings",
            params: { condoId: scope.condoId },
            label: "Configurações",
            icon: Settings,
          },
        ]
      : [
          {
            to: "/inbox",
            label: "Inbox",
            icon: Inbox,
            ...(typeof inboxUnreadCount === "number" ? { badge: inboxUnreadCount } : {}),
          },
          { to: "/tickets", label: "Tickets", icon: Ticket },
          {
            to: "/approvals",
            label: "Aprovações",
            icon: CheckCircle2,
            ...(typeof approvalsCount === "number" ? { badge: approvalsCount } : {}),
          },
        ];

  const estrutura: Item[] =
    scope.kind === "condo"
      ? [
          {
            to: "/c/$condoId/structure/blocks",
            params: { condoId: scope.condoId },
            label: "Blocos",
            icon: Building2,
          },
          {
            to: "/c/$condoId/structure/units",
            params: { condoId: scope.condoId },
            label: "Unidades",
            icon: Home,
          },
          {
            to: "/c/$condoId/structure/common-areas",
            params: { condoId: scope.condoId },
            label: "Áreas comuns",
            icon: Trees,
          },
        ]
      : [];

  function renderItem(item: Item) {
    const active = matchesActive(location.pathname, item.to, item.params);
    return (
      <Link
        key={`${item.to}:${item.params?.condoId ?? "_"}`}
        to={item.to}
        params={item.params}
        style={{ textDecoration: "none" }}
      >
        <SidebarItem icon={item.icon} label={item.label} active={active} badge={item.badge} />
      </Link>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <SidebarHeader title={scopeTitle} subtitle={scopeSubtitle} />
      <div className={styles.groups}>
        <SidebarGroup label="Operação">{operacao.map(renderItem)}</SidebarGroup>
        {estrutura.length > 0 ? (
          <SidebarGroup label="Estrutura">{estrutura.map(renderItem)}</SidebarGroup>
        ) : null}
      </div>
      <SidebarFooter />
    </aside>
  );
}

function matchesActive(pathname: string, to: string, params?: Record<string, string>): boolean {
  let expected = to;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      expected = expected.replace(`$${key}`, value);
    }
  }
  return pathname === expected || pathname.startsWith(expected + "/");
}
```

- [ ] **Step 5: Run, verificar pass**

Run: `npx vitest run src/ui/AppShell/Sidebar/Sidebar.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Typecheck + commit**

```bash
npm run typecheck
git add src/ui/AppShell/Sidebar/Sidebar.tsx src/ui/AppShell/Sidebar/Sidebar.module.css src/ui/AppShell/Sidebar/Sidebar.test.tsx
git commit -m "feat(shell): adiciona Sidebar agrupada (Operação + Estrutura)"
```

---

### Task 8: `RoleBadge`

**Files:**

- Create: `src/ui/AppShell/RoleBadge.tsx`
- Create: `src/ui/AppShell/RoleBadge.module.css`

Badge com texto do role. Recebe `role: "admin" | "sindico" | "zelador"`.

- [ ] **Step 1: CSS**

Criar `src/ui/AppShell/RoleBadge.module.css`:

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--radius-full, 999px);
  font-size: var(--fs-xs);
  font-weight: var(--fw-medium);
  background-color: var(--bg-muted);
  color: var(--fg-secondary);
  white-space: nowrap;
}
```

- [ ] **Step 2: TSX**

Criar `src/ui/AppShell/RoleBadge.tsx`:

```tsx
import styles from "./RoleBadge.module.css";

const LABELS: Record<"admin" | "sindico" | "zelador", string> = {
  admin: "Administradora",
  sindico: "Síndico",
  zelador: "Zelador",
};

interface RoleBadgeProps {
  role: keyof typeof LABELS;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return <span className={styles.badge}>{LABELS[role]}</span>;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/AppShell/RoleBadge.tsx src/ui/AppShell/RoleBadge.module.css
git commit -m "feat(shell): adiciona RoleBadge"
```

---

### Task 9: `SearchBox` (visual-only)

**Files:**

- Create: `src/ui/AppShell/Topbar/SearchBox.tsx`
- Create: `src/ui/AppShell/Topbar/SearchBox.module.css`

Input com ícone de lupa. Foco mostra toast/tooltip "Em breve". MVP: usa `aria-disabled` + `readOnly` + título "Em breve" para sinalizar; sem toast lib.

- [ ] **Step 1: CSS**

Criar `src/ui/AppShell/Topbar/SearchBox.module.css`:

```css
.wrap {
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 480px;
  background-color: var(--bg-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 0 var(--space-3);
  gap: var(--space-2);
}

.icon {
  width: 16px;
  height: 16px;
  color: var(--fg-tertiary);
}

.input {
  flex: 1;
  background: transparent;
  border: none;
  padding: var(--space-2) 0;
  font-size: var(--fs-sm);
  color: var(--fg-primary);
}

.input:focus {
  outline: none;
}

.input::placeholder {
  color: var(--fg-tertiary);
}
```

- [ ] **Step 2: TSX**

Criar `src/ui/AppShell/Topbar/SearchBox.tsx`:

```tsx
import { Search } from "lucide-react";
import styles from "./SearchBox.module.css";

export function SearchBox() {
  return (
    <div className={styles.wrap}>
      <Search className={styles.icon} aria-hidden="true" />
      <input
        type="search"
        className={styles.input}
        placeholder="Buscar chamados, moradores…"
        aria-label="Buscar"
        readOnly
        title="Busca global em breve"
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/AppShell/Topbar/SearchBox.tsx src/ui/AppShell/Topbar/SearchBox.module.css
git commit -m "feat(shell): adiciona SearchBox visual-only"
```

---

### Task 10: Adaptar `CondoSwitcher` para incluir "Todos os condomínios"

**Files:**

- Modify: `src/features/condo/CondoSwitcher.tsx`
- Modify: `src/features/condo/CondoSwitcher.test.tsx`

Adicionar item "Todos os condomínios" no topo da lista. Selecionar navega para a rota cross-condo equivalente (`/inbox`, `/tickets`, `/approvals`) usando o mesmo `subPath` que já é derivado.

- [ ] **Step 1: Test failing**

Adicionar em `src/features/condo/CondoSwitcher.test.tsx` (no `describe` existente):

```tsx
import { Globe } from "lucide-react"; // (se já estiver importado, ignorar)

it("renderiza item 'Todos os condomínios'", async () => {
  // ...setup conforme padrão existente do arquivo (mock useMyCondos com 2 condos)
  // depois de abrir o dropdown:
  await userEvent.click(screen.getByRole("button"));
  expect(screen.getByText("Todos os condomínios")).toBeInTheDocument();
});

it("seleciona 'Todos' e navega para /inbox quando rota atual é inbox", async () => {
  // mock: subPath = "inbox" (mock useMatches retornando rota /_app/c/$condoId/inbox)
  await userEvent.click(screen.getByRole("button"));
  await userEvent.click(screen.getByText("Todos os condomínios"));
  expect(mockNavigate).toHaveBeenCalledWith({ to: "/inbox" });
});

it("seleciona 'Todos' navegando para sub-rota cross-condo correta", async () => {
  // mock: subPath = "tickets"
  // expect navigate to "/tickets"
});
```

> Adaptar aos mocks já existentes no arquivo. Se o arquivo usa um helper de setup, reutilizar.

- [ ] **Step 2: Run, verificar falha**

Run: `npx vitest run src/features/condo/CondoSwitcher.test.tsx`
Expected: FAIL nos 3 novos testes.

- [ ] **Step 3: Implementação**

Editar `src/features/condo/CondoSwitcher.tsx`:

1. Importar `Globe` de `lucide-react`.
2. Antes do `.map` de condos no JSX do `DropdownMenu.Content`, adicionar:

```tsx
<DropdownMenu.Item
  className={styles.item}
  onSelect={() => handleSelectAll()}
>
  <Globe size={16} aria-hidden="true" />
  <span>Todos os condomínios</span>
  {activeCondoId === undefined ? <Check size={16} className={styles.check} /> : null}
</DropdownMenu.Item>
<DropdownMenu.Separator className={styles.separator} />
```

3. Adicionar função `handleSelectAll`:

```ts
function handleSelectAll() {
  switch (subPath) {
    case "tickets":
      void navigate({ to: "/tickets" });
      return;
    case "approvals":
      void navigate({ to: "/approvals" });
      return;
    default:
      void navigate({ to: "/inbox" });
  }
}
```

> Nota: as rotas `/tickets` e `/approvals` cross-condo ainda não existem; vão ser criadas em Task 12. Por enquanto o TypeScript da `navigate()` vai reclamar. Solução: usar `as unknown as Parameters<typeof navigate>[0]` (mesmo padrão do Plan 4.2). Em Task 12, depois de criar as rotas, remover o cast.

- [ ] **Step 4: Run, verificar pass**

Run: `npx vitest run src/features/condo/CondoSwitcher.test.tsx`
Expected: PASS (todos os testes existentes + 3 novos).

- [ ] **Step 5: Commit**

```bash
git add src/features/condo/CondoSwitcher.tsx src/features/condo/CondoSwitcher.test.tsx
git commit -m "feat(condo): CondoSwitcher inclui 'Todos os condomínios'"
```

---

### Task 11: `Topbar` (composição)

**Files:**

- Create: `src/ui/AppShell/Topbar/Topbar.tsx`
- Create: `src/ui/AppShell/Topbar/Topbar.module.css`
- Create: `src/ui/AppShell/Topbar/Topbar.test.tsx`

Composição: logo "Zivy" + `CondoSwitcher` + `SearchBox` + `RoleBadge` + `Settings` icon.

- [ ] **Step 1: Test failing**

Criar `src/ui/AppShell/Topbar/Topbar.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Topbar } from "./Topbar";

vi.mock("@/features/condo/CondoSwitcher", () => ({
  CondoSwitcher: () => <div data-testid="condo-switcher" />,
}));

describe("Topbar", () => {
  it("renderiza logo, switcher, busca e role badge", () => {
    render(<Topbar role="admin" />);
    expect(screen.getByText(/Zivy/i)).toBeInTheDocument();
    expect(screen.getByTestId("condo-switcher")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Buscar/i)).toBeInTheDocument();
    expect(screen.getByText(/Administradora/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, verificar falha**

Run: `npx vitest run src/ui/AppShell/Topbar/Topbar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: CSS**

Criar `src/ui/AppShell/Topbar/Topbar.module.css`:

```css
.topbar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  background-color: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  height: 56px;
  flex-shrink: 0;
}

.logo {
  font-size: var(--fs-lg);
  font-weight: var(--fw-bold);
  color: var(--fg-primary);
}

.right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.settings {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: transparent;
  border: none;
  color: var(--fg-secondary);
  cursor: pointer;
}

.settings:hover {
  background-color: var(--bg-muted);
  color: var(--fg-primary);
}
```

- [ ] **Step 4: TSX**

Criar `src/ui/AppShell/Topbar/Topbar.tsx`:

```tsx
import { Settings } from "lucide-react";
import { CondoSwitcher } from "@/features/condo/CondoSwitcher";
import { RoleBadge } from "@/ui/AppShell/RoleBadge";
import { SearchBox } from "./SearchBox";
import styles from "./Topbar.module.css";

interface TopbarProps {
  role: "admin" | "sindico" | "zelador";
}

export function Topbar({ role }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.logo}>Zivy</div>
      <CondoSwitcher />
      <SearchBox />
      <div className={styles.right}>
        <RoleBadge role={role} />
        <button type="button" className={styles.settings} aria-label="Configurações">
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Run, verificar pass**

Run: `npx vitest run src/ui/AppShell/Topbar/Topbar.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/AppShell/Topbar/Topbar.tsx src/ui/AppShell/Topbar/Topbar.module.css src/ui/AppShell/Topbar/Topbar.test.tsx
git commit -m "feat(shell): adiciona Topbar"
```

---

### Task 12: Rotas placeholder novas

**Files:**

- Create: `src/app/routes/_app/inbox.tsx`
- Create: `src/app/routes/_app/tickets.tsx`
- Create: `src/app/routes/_app/approvals.tsx`
- Create: `src/app/routes/_app/c/$condoId/structure/blocks.tsx`
- Create: `src/app/routes/_app/c/$condoId/structure/units.tsx`
- Create: `src/app/routes/_app/c/$condoId/structure/common-areas.tsx`
- Auto-update: `src/app/routeTree.gen.ts`

Placeholders cross-condo + estrutura. Todos retornam `EmptyState`.

- [ ] **Step 1: Cross-condo placeholders**

Criar `src/app/routes/_app/inbox.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/_app/inbox")({
  component: () => (
    <EmptyState
      title="Inbox cross-condo"
      description="Será implementada no Slice 5.2 (Activity Feed)."
    />
  ),
});
```

Criar `src/app/routes/_app/tickets.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/_app/tickets")({
  component: () => <EmptyState title="Tickets cross-condo" description="Em breve." />,
});
```

Criar `src/app/routes/_app/approvals.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/_app/approvals")({
  component: () => <EmptyState title="Aprovações cross-condo" description="Em breve." />,
});
```

- [ ] **Step 2: Structure placeholders**

Criar `src/app/routes/_app/c/$condoId/structure/blocks.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/_app/c/$condoId/structure/blocks")({
  component: () => (
    <EmptyState title="Blocos" description="Será implementada em um plano futuro." />
  ),
});
```

Criar `src/app/routes/_app/c/$condoId/structure/units.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/_app/c/$condoId/structure/units")({
  component: () => (
    <EmptyState title="Unidades" description="Será implementada em um plano futuro." />
  ),
});
```

Criar `src/app/routes/_app/c/$condoId/structure/common-areas.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";

export const Route = createFileRoute("/_app/c/$condoId/structure/common-areas")({
  component: () => (
    <EmptyState title="Áreas comuns" description="Será implementada em um plano futuro." />
  ),
});
```

- [ ] **Step 3: Rodar dev server para regenerar routeTree**

Run: `npm run dev`
Esperar log "Generated route tree" e parar (Ctrl+C).

- [ ] **Step 4: Remover cast em CondoSwitcher**

Voltar em `src/features/condo/CondoSwitcher.tsx` (Task 10) e remover o `as unknown as Parameters<typeof navigate>[0]` agora que as rotas existem. `npm run typecheck` deve passar.

- [ ] **Step 5: Suite**

Run: `npm run typecheck && npm run test`
Expected: verde.

- [ ] **Step 6: Commit**

```bash
git add src/app/routes/_app/inbox.tsx src/app/routes/_app/tickets.tsx src/app/routes/_app/approvals.tsx src/app/routes/_app/c/$condoId/structure/ src/app/routeTree.gen.ts src/features/condo/CondoSwitcher.tsx
git commit -m "feat(shell): rotas placeholder cross-condo e structure/*"
```

---

### Task 13: Reescrever `AppShell` + remover Header/Sidebar antigos

**Files:**

- Modify: `src/ui/AppShell/AppShell.tsx`
- Modify: `src/ui/AppShell/AppShell.module.css`
- Delete: `src/ui/AppShell/Header.tsx`, `src/ui/AppShell/Header.module.css`
- Delete: `src/ui/AppShell/Sidebar.tsx`, `src/ui/AppShell/Sidebar.module.css` (versão velha)
- Modify: `src/ui/AppShell/AppShell.test.tsx`
- Modify: `src/ui/AppShell/AppShell.stories.tsx`

`AppShell` agora compõe `Topbar` + `Sidebar` (nova) + `<main>{children}</main>`. Calcula `scope`, `scopeTitle`, `scopeSubtitle`, `role` para passar para Topbar/Sidebar.

- [ ] **Step 1: Atualizar `AppShell.module.css`**

Substituir conteúdo:

```css
.shell {
  display: grid;
  grid-template-rows: auto 1fr;
  grid-template-columns: 240px 1fr;
  grid-template-areas:
    "topbar topbar"
    "sidebar main";
  min-height: 100vh;
}

.topbar {
  grid-area: topbar;
}

.sidebar {
  grid-area: sidebar;
  overflow-y: auto;
}

.main {
  grid-area: main;
  padding: var(--space-6);
  overflow-y: auto;
}

@media (max-width: 767px) {
  .shell {
    grid-template-columns: 1fr;
    grid-template-areas:
      "topbar"
      "main";
  }

  .sidebar {
    display: none;
  }
}
```

> Mobile menu (drawer) sai do escopo desta tarefa para manter focada. Mobile ganha "sidebar oculta" + topbar; drawer pode entrar em ajuste posterior se necessário.

- [ ] **Step 2: Atualizar `AppShell.tsx`**

Substituir conteúdo por:

```tsx
import type { ReactNode } from "react";
import { useScope } from "@/features/scope/useScope";
import { useMyCondos } from "@/features/condo/useMyCondos";
import { Topbar } from "./Topbar/Topbar";
import { Sidebar } from "./Sidebar/Sidebar";
import styles from "./AppShell.module.css";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const scope = useScope();
  const { data: condos } = useMyCondos();

  let scopeTitle = "Todos os condomínios";
  let scopeSubtitle: string | undefined;
  let role: "admin" | "sindico" | "zelador" = "zelador";

  if (scope.kind === "condo" && condos) {
    const current = condos.find((c) => c.id === scope.condoId);
    if (current) {
      scopeTitle = current.name;
      scopeSubtitle = subtitleFor(current);
      role = current.role;
    }
  } else if (condos) {
    scopeSubtitle = `${condos.length} condomínio${condos.length === 1 ? "" : "s"}`;
    role = highestRole(condos.map((c) => c.role));
  }

  return (
    <div className={styles.shell}>
      <div className={styles.topbar}>
        <Topbar role={role} />
      </div>
      <div className={styles.sidebar}>
        <Sidebar
          scope={scope}
          scopeTitle={scopeTitle}
          {...(scopeSubtitle ? { scopeSubtitle } : {})}
        />
      </div>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

function subtitleFor(condo: { unitCount?: number; residentCount?: number }): string | undefined {
  if (typeof condo.unitCount === "number") {
    return `${condo.unitCount} unidades`;
  }
  return undefined;
}

const ROLE_ORDER: Record<"admin" | "sindico" | "zelador", number> = {
  admin: 0,
  sindico: 1,
  zelador: 2,
};

function highestRole(roles: ("admin" | "sindico" | "zelador")[]): "admin" | "sindico" | "zelador" {
  return roles.reduce<"admin" | "sindico" | "zelador">(
    (acc, r) => (ROLE_ORDER[r] < ROLE_ORDER[acc] ? r : acc),
    "zelador",
  );
}
```

> **Nota sobre `useMyCondos`:** o hook já retorna o role per-condo (Plan 3). Se o shape diferir do assumido (campo `role`), ajustar aqui.

- [ ] **Step 3: Atualizar `AppShell.test.tsx`**

Os testes antigos referenciam Header/Sidebar antigos. Reescrever:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "./AppShell";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({}),
  useRouterState: () => ({ location: { pathname: "/inbox" } }),
  Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
    <a {...(rest as Record<string, string>)}>{children}</a>
  ),
}));

vi.mock("@/features/condo/useMyCondos", () => ({
  useMyCondos: () => ({
    data: [{ id: "c1", name: "Cond Y", role: "admin", unitCount: 100 }],
    isPending: false,
    error: null,
  }),
}));

vi.mock("@/features/condo/CondoSwitcher", () => ({
  CondoSwitcher: () => <div data-testid="condo-switcher" />,
}));

describe("AppShell", () => {
  it("renderiza topbar, sidebar e children", () => {
    render(
      <AppShell>
        <h1>Conteúdo</h1>
      </AppShell>,
    );
    expect(screen.getByText("Zivy")).toBeInTheDocument();
    expect(screen.getByText(/Operação/i)).toBeInTheDocument();
    expect(screen.getByText("Conteúdo")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Deletar arquivos antigos**

```bash
rm src/ui/AppShell/Header.tsx src/ui/AppShell/Header.module.css
rm src/ui/AppShell/Sidebar.tsx src/ui/AppShell/Sidebar.module.css
```

> Se `AppShell.stories.tsx` ou outro arquivo importava Header/Sidebar antigos, ajustar imports. Grep antes:
>
> Run: `grep -rn "AppShell/Header\|AppShell/Sidebar[^/]" src/` e corrigir cada referência.

- [ ] **Step 5: Run suite + storybook build**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: verde.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(shell): reescreve AppShell com Topbar+Sidebar nova; remove Header velho"
```

---

### Task 14: Storybook das peças novas

**Files:**

- Create: `src/ui/AppShell/Sidebar/Sidebar.stories.tsx`
- Create: `src/ui/AppShell/Topbar/Topbar.stories.tsx`
- Create: `src/ui/AppShell/RoleBadge.stories.tsx`

Histórias mínimas para validar visual rápido.

- [ ] **Step 1: Sidebar.stories.tsx**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Sidebar } from "./Sidebar";

const meta: Meta<typeof Sidebar> = {
  title: "AppShell/Sidebar",
  component: Sidebar,
};
export default meta;

type Story = StoryObj<typeof Sidebar>;

export const AllCondos: Story = {
  args: {
    scope: { kind: "all" },
    scopeTitle: "Todos os condomínios",
    scopeSubtitle: "5 condomínios · 488 unidades",
    inboxUnreadCount: 8,
    approvalsCount: 3,
  },
};

export const SingleCondo: Story = {
  args: {
    scope: { kind: "condo", condoId: "c1" },
    scopeTitle: "Residencial Jardins",
    scopeSubtitle: "120 unidades",
    inboxUnreadCount: 3,
  },
};
```

> Se Storybook reclamar de `Link`/`useRouterState`, registrar um decorator com mock router similar aos testes.

- [ ] **Step 2: Topbar.stories.tsx**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Topbar } from "./Topbar";

const meta: Meta<typeof Topbar> = {
  title: "AppShell/Topbar",
  component: Topbar,
};
export default meta;

export const Admin: StoryObj<typeof Topbar> = { args: { role: "admin" } };
export const Sindico: StoryObj<typeof Topbar> = { args: { role: "sindico" } };
export const Zelador: StoryObj<typeof Topbar> = { args: { role: "zelador" } };
```

- [ ] **Step 3: RoleBadge.stories.tsx**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { RoleBadge } from "./RoleBadge";

const meta: Meta<typeof RoleBadge> = { title: "AppShell/RoleBadge", component: RoleBadge };
export default meta;

export const Admin: StoryObj<typeof RoleBadge> = { args: { role: "admin" } };
export const Sindico: StoryObj<typeof RoleBadge> = { args: { role: "sindico" } };
export const Zelador: StoryObj<typeof RoleBadge> = { args: { role: "zelador" } };
```

- [ ] **Step 4: Validar build do storybook**

Run: `npm run build-storybook`
Expected: build sucesso.

- [ ] **Step 5: Commit**

```bash
git add src/ui/AppShell/Sidebar/Sidebar.stories.tsx src/ui/AppShell/Topbar/Topbar.stories.tsx src/ui/AppShell/RoleBadge.stories.tsx
git commit -m "docs(storybook): histórias para Sidebar, Topbar e RoleBadge"
```

---

### Task 15: Slice 5.1 — fechar PR

- [ ] **Step 1: Suite completa + build**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: tudo verde.

- [ ] **Step 2: Smoke manual**

```bash
npm run dev
```

Abrir http://localhost:5173. Verificar:

- Login → vai para landing.
- Topbar aparece com "Zivy", switcher, busca (readonly), RoleBadge.
- Sidebar nova com grupos OPERAÇÃO e ESTRUTURA (apenas em condo specifico).
- Selecionar condo no switcher navega para `/c/$id/inbox` — Inbox 4.2 ainda funciona.
- Selecionar "Todos os condomínios" → vai para `/inbox` cross-condo — mostra placeholder "Será implementada no Slice 5.2".
- Rotas placeholder `/tickets`, `/approvals`, `/c/$id/structure/*` carregam EmptyState sem erros.
- Não há erros de hidratação no console.

Parar (Ctrl+C).

- [ ] **Step 3: Push e abrir PR**

```bash
git push -u origin feature/plan-5-1-shell
gh pr create --base develop --title "feat(plan-5): shell visual novo (Topbar + Sidebar agrupada)" --body "$(cat <<'EOF'
## Summary
- Substitui `Header` + `Sidebar` simples do Plan 2 por `Topbar` (logo + switcher + busca visual + role badge + settings) e `Sidebar` agrupada (ESCOPO + OPERAÇÃO + ESTRUTURA).
- Introduz hook `useScope()` derivado da URL e novas rotas placeholder cross-condo (`/inbox`, `/tickets`, `/approvals`) e per-condo (`/c/$id/structure/{blocks,units,common-areas}`).
- `CondoSwitcher` agora inclui item "Todos os condomínios".
- `Sidebar` esconde ESTRUTURA em escopo "all".
- Plan 4.2 (e 4.3 quando mergeada) continuam funcionando em `/c/$id/inbox`.

Spec: `docs/superpowers/specs/2026-05-14-plan-5-redesign-shell-activity-feed-design.md`.

## Test plan
- [ ] CI verde.
- [ ] Smoke manual em preview Vercel: shell carrega; switcher → "Todos" navega para `/inbox` placeholder; ESTRUTURA aparece só em condo específico.
- [ ] Inbox 4.2 segue funcional em `/c/$id/inbox`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Summary

Slice 5.1 do Plan 5. Sem mudanças de dados — Plan 4 continua funcionando. Próximo slice planta o `ActivityRepository` + componentes do feed.

## Test plan

- [ ] CI verde (typecheck, lint, vitest, build).
- [ ] Storybook builda sem erro.
- [ ] Smoke manual em preview Vercel cobre os critérios da Task 15.

---

# Slice 5.2 — Activity Feed (adapter local + componentes)

**Branch:** `feature/plan-5-2-activity-feed` (sair de `develop` atualizada com 5.1 mergeada)
**PR:** contra `develop`
**Escopo:** `ActivityRepository` + `LocalActivityRepository` com fixtures + `RepositoryProvider` + hooks (`useActivityFeed`, `useMarkRead`) + componentes `ActivityFeed`, `ActivityFeedTabs`, `ActivityItem`. Plugar em `/inbox` e `/c/$id/inbox`. Substituir `InboxPage` do Plan 4.2 — Plan 4 não regride visualmente, ganha o feed novo.

---

### Task 15.A: Débitos técnicos do Slice 5.1 (do code review do PR #14)

Itens não-bloqueantes deixados no PR #14 e endereçados antes de plantar o feed. Cada um é um commit separado.

- [ ] **Step 1: Teste de active state da `Sidebar`**

  Em `src/ui/AppShell/Sidebar/Sidebar.test.tsx`, adicionar um caso que renderiza `<Sidebar pathname="/c/c1/inbox" scope={{ kind: "condo", condoId: "c1" }} />` e asserta que o item "Inbox" tem classe `active` (use `closest("a, button")?.className` e `toContain("active")`). Cobrir também o caso de `kind: "all"` + pathname `/inbox`. Justificativa: garantir que `matchesActive` não regride quando reordenarmos rotas no 5.2/5.3.

  Commit: `test(sidebar): cobre active state por pathname`

- [ ] **Step 2: `SidebarFooter` mostra version+branch só em dev**

  (Opcional — implementar se Slice 5.1 não tiver tratado.) Em produção, suprimir a string `v… · branch` ou trocar por algo neutro (ex.: ano). Em dev, manter. Critério: `if (import.meta.env.PROD) return null` (ou esconder via flag). Justifica: branch name + commit hash em prod expõem detalhes sobre fluxo interno; pode ficar restrito ao staging/preview.

  Commit: `feat(sidebar): footer só exibe versão em dev/preview` (skip se já feito no 5.1)

- [ ] **Step 3: Extrair `define` compartilhado entre Vite e Vitest**

  Criar `build/defines.ts` (ou `scripts/build-defines.ts`) exportando:

  ```ts
  import { execSync } from "node:child_process";
  import pkg from "../package.json" with { type: "json" };

  function safeBranch(): string {
    try {
      return execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
    } catch {
      return "unknown";
    }
  }

  export const buildDefines = {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BRANCH__: JSON.stringify(safeBranch()),
  } as const;
  ```

  Importar em `vite.config.ts` e `vitest.config.ts` no campo `define`. Remover os literais duplicados.

  Commit: `chore(build): extrai defines compartilhados Vite/Vitest`

- [ ] **Step 4: Criar `src/design-tokens/semantic.css` e migrar tokens de sidebar**

  Mover os 6 tokens de sidebar (`--sidebar-item-bg-hover|active|fg-active|badge-bg|badge-fg|group-label`) de `colors.css` para um novo arquivo `src/design-tokens/semantic.css`. Estrutura: dois blocos (`:root` e `:root[data-theme="dark"]`) com os mesmos seis tokens (valores referenciando `var(--bg-*)`/`var(--brand-*)`/`var(--fg-*)` já existentes). Adicionar `@import url("./semantic.css")` em `src/design-tokens/index.css` depois de `colors.css` e antes de `shadow.css`. Justificativa: separar tokens "primitivos" (cor base) de "semânticos" (papel funcional) — abre espaço para os tokens de activity (`--activity-*`) no Step seguinte. Rodar `npm run lint && npm run test` para confirmar nada quebrou.

  Commit: `refactor(tokens): extrai tokens semânticos para semantic.css`

> Quando esses 4 steps terminarem, seguir para Task 16. Eles entram no MESMO PR do Slice 5.2 (não abrir PR separado).

---

### Task 16: Tipos do repository

**Files:**

- Create: `src/features/activity/repository/types.ts`

- [ ] **Step 1: Conteúdo**

```ts
import type { Scope } from "@/features/scope/useScope";

// Alinhado com KIND_ICON em docs/handoff/.../page-inbox.jsx:15–20.
// Urgência NÃO é kind separado — vem em `priority`.
export const ACTIVITY_KINDS = [
  "ticket_new",
  "ticket_comment",
  "approval",
  "status_change",
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export type ActivityPriority = "low" | "medium" | "high" | "urgent";

export type ResourceRef =
  | { type: "ticket"; ticketId: string }
  | { type: "resident_approval"; residentId: string };

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  condoId: string;
  condoName: string;
  title: string;
  subtitle?: string; // ".ii-sub" no handoff (texto livre com separadores ·)
  resourceRef: ResourceRef;
  priority?: ActivityPriority; // só faz sentido para kind=ticket_new (urgent → faixa lateral vermelha)
  occurredAt: string; // ISO 8601 — formatado por formatRelTime para ".ii-time"
  readAt: string | null; // null = unread (gera .inbox-item.unread no handoff)
  avatar?: string; // 2 chars maiúsculos (ex.: "PO") — opcional, fallback para ícone do kind
}

export type ActivityTab = "all" | "unread" | "approvals";

export interface ActivityListInput {
  scope?: Scope;
  tab?: ActivityTab;
  cursor?: string;
  limit?: number;
}

export interface ActivityListResult {
  items: ActivityEvent[];
  nextCursor?: string;
  counts: Record<ActivityTab, number>;
}

export interface ActivityRepository {
  list(input: ActivityListInput): Promise<ActivityListResult>;
  markRead(id: string): Promise<void>;
  markAllRead(scope?: Scope): Promise<void>;
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npm run typecheck
git add src/features/activity/repository/types.ts
git commit -m "feat(activity): tipos do ActivityRepository"
```

---

### Task 17: Fixtures determinísticas

**Files:**

- Create: `src/features/activity/repository/fixtures.ts`

12 eventos cobrindo todos os kinds, distribuídos entre 2 condos.

- [ ] **Step 1: Conteúdo**

```ts
import type { ActivityEvent } from "./types";

const NOW = Date.parse("2026-05-14T12:00:00Z");
function ago(minutes: number): string {
  return new Date(NOW - minutes * 60 * 1000).toISOString();
}

export const FIXTURES: ActivityEvent[] = [
  {
    id: "ev-1",
    kind: "ticket_new",
    condoId: "c-jardins",
    condoName: "Residencial Jardins",
    title: "Novo chamado urgente: Câmera de entrada offline",
    subtitle: "Residencial Jardins · TKT-2026-101 · Portaria",
    resourceRef: { type: "ticket", ticketId: "tk-101" },
    priority: "urgent",
    occurredAt: ago(15),
    readAt: null,
  },
  {
    id: "ev-2",
    kind: "ticket_new",
    condoId: "c-jardins",
    condoName: "Residencial Jardins",
    title: "Novo chamado: Elevador parado no 8º andar",
    subtitle: "Residencial Jardins",
    resourceRef: { type: "ticket", ticketId: "tk-102" },
    priority: "medium",
    occurredAt: ago(45),
    readAt: null,
  },
  {
    id: "ev-3",
    kind: "approval",
    condoId: "c-jardins",
    condoName: "Residencial Jardins",
    title: "Aprovação pendente: Lucas Ferreira (Bloco B, 203)",
    subtitle: "Residencial Jardins · Verificar identidade",
    resourceRef: { type: "resident_approval", residentId: "res-501" },
    occurredAt: ago(120),
    readAt: null,
  },
  {
    id: "ev-4",
    kind: "ticket_comment",
    condoId: "c-jardins",
    condoName: "Residencial Jardins",
    title: "Novo comentário em TKT-2026-041",
    subtitle: "Residencial Jardins · 'Obrigado pelo retorno rápido'",
    resourceRef: { type: "ticket", ticketId: "tk-041" },
    occurredAt: ago(180),
    readAt: ago(60),
  },
  {
    id: "ev-5",
    kind: "ticket_new",
    condoId: "c-jardins",
    condoName: "Residencial Jardins",
    title: "Novo chamado: Vazamento na 2ª garagem G1",
    subtitle: "Residencial Jardins",
    resourceRef: { type: "ticket", ticketId: "tk-103" },
    priority: "medium",
    occurredAt: ago(240),
    readAt: ago(120),
  },
  {
    id: "ev-6",
    kind: "status_change",
    condoId: "c-vilamar",
    condoName: "Vila Mar",
    title: "TKT-2026-038 → Em andamento",
    subtitle: "Vila Mar",
    resourceRef: { type: "ticket", ticketId: "tk-038" },
    occurredAt: ago(300),
    readAt: ago(60),
  },
  {
    id: "ev-7",
    kind: "approval",
    condoId: "c-vilamar",
    condoName: "Vila Mar",
    title: "Aprovação pendente: Maria Souza (Bloco A, 12)",
    subtitle: "Vila Mar",
    resourceRef: { type: "resident_approval", residentId: "res-502" },
    occurredAt: ago(360),
    readAt: null,
  },
  {
    id: "ev-8",
    kind: "ticket_new",
    condoId: "c-vilamar",
    condoName: "Vila Mar",
    title: "Novo chamado: Portão da garagem com ruído",
    subtitle: "Vila Mar",
    resourceRef: { type: "ticket", ticketId: "tk-104" },
    priority: "low",
    occurredAt: ago(420),
    readAt: ago(60),
  },
  {
    id: "ev-9",
    kind: "ticket_comment",
    condoId: "c-vilamar",
    condoName: "Vila Mar",
    title: "Novo comentário em TKT-2026-032",
    subtitle: "Vila Mar",
    resourceRef: { type: "ticket", ticketId: "tk-032" },
    occurredAt: ago(540),
    readAt: ago(180),
  },
  {
    id: "ev-10",
    kind: "ticket_new",
    condoId: "c-vilamar",
    condoName: "Vila Mar",
    title: "Chamado urgente: Falta d'água no bloco C",
    subtitle: "Vila Mar · TKT-2026-105 · Hidráulica",
    resourceRef: { type: "ticket", ticketId: "tk-105" },
    priority: "urgent",
    occurredAt: ago(720),
    readAt: ago(360),
  },
  {
    id: "ev-11",
    kind: "status_change",
    condoId: "c-jardins",
    condoName: "Residencial Jardins",
    title: "TKT-2026-030 → Resolvido",
    subtitle: "Residencial Jardins",
    resourceRef: { type: "ticket", ticketId: "tk-030" },
    occurredAt: ago(900),
    readAt: ago(720),
  },
  {
    id: "ev-12",
    kind: "ticket_new",
    condoId: "c-jardins",
    condoName: "Residencial Jardins",
    title: "Novo chamado: Lâmpada queimada na escada",
    subtitle: "Residencial Jardins",
    resourceRef: { type: "ticket", ticketId: "tk-106" },
    priority: "low",
    occurredAt: ago(1440),
    readAt: ago(60),
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/features/activity/repository/fixtures.ts
git commit -m "feat(activity): fixtures determinísticas (12 eventos)"
```

---

### Task 18: `LocalActivityRepository`

**Files:**

- Create: `src/features/activity/repository/local.ts`
- Create: `src/features/activity/repository/local.test.ts`

Implementação em memória. Estado `readAt` persistido em `localStorage` (chave `zivy.activity.reads`).

- [ ] **Step 1: Test failing**

Criar `src/features/activity/repository/local.test.ts`:

```ts
import { describe, expect, it, beforeEach } from "vitest";
import { FIXTURES } from "./fixtures";
import { createLocalActivityRepository } from "./local";

beforeEach(() => {
  localStorage.clear();
});

describe("LocalActivityRepository", () => {
  it("lista todos os eventos sem scope", async () => {
    const repo = createLocalActivityRepository({ events: FIXTURES });
    const res = await repo.list({});
    expect(res.items.length).toBe(FIXTURES.length);
    expect(res.counts.all).toBe(FIXTURES.length);
  });

  it("filtra por scope condo", async () => {
    const repo = createLocalActivityRepository({ events: FIXTURES });
    const res = await repo.list({ scope: { kind: "condo", condoId: "c-jardins" } });
    expect(res.items.every((e) => e.condoId === "c-jardins")).toBe(true);
  });

  it("filtra por tab=unread", async () => {
    const repo = createLocalActivityRepository({ events: FIXTURES });
    const res = await repo.list({ tab: "unread" });
    expect(res.items.every((e) => e.readAt === null)).toBe(true);
  });

  it("filtra por tab=approvals", async () => {
    const repo = createLocalActivityRepository({ events: FIXTURES });
    const res = await repo.list({ tab: "approvals" });
    expect(res.items.every((e) => e.kind === "approval")).toBe(true);
  });

  it("counts reflete totais por tab respeitando scope", async () => {
    const repo = createLocalActivityRepository({ events: FIXTURES });
    const res = await repo.list({ scope: { kind: "condo", condoId: "c-jardins" } });
    expect(res.counts.all).toBeGreaterThan(0);
    expect(res.counts.unread).toBeGreaterThan(0);
    expect(res.counts.approvals).toBeGreaterThan(0);
  });

  it("ordena por occurredAt desc", async () => {
    const repo = createLocalActivityRepository({ events: FIXTURES });
    const res = await repo.list({});
    const times = res.items.map((e) => Date.parse(e.occurredAt));
    for (let i = 1; i < times.length; i += 1) {
      const prev = times[i - 1] ?? 0;
      const cur = times[i] ?? 0;
      expect(prev).toBeGreaterThanOrEqual(cur);
    }
  });

  it("markRead persiste e idempotente", async () => {
    const repo = createLocalActivityRepository({ events: FIXTURES });
    await repo.markRead("ev-1");
    let res = await repo.list({ tab: "unread" });
    expect(res.items.find((e) => e.id === "ev-1")).toBeUndefined();
    await repo.markRead("ev-1"); // idempotente — sem throw
    res = await repo.list({ tab: "unread" });
    expect(res.items.find((e) => e.id === "ev-1")).toBeUndefined();
  });

  it("markAllRead marca tudo do scope", async () => {
    const repo = createLocalActivityRepository({ events: FIXTURES });
    await repo.markAllRead({ kind: "condo", condoId: "c-jardins" });
    const res = await repo.list({ scope: { kind: "condo", condoId: "c-jardins" }, tab: "unread" });
    expect(res.items.length).toBe(0);
    // outro condo continua com não lidos
    const other = await repo.list({
      scope: { kind: "condo", condoId: "c-vilamar" },
      tab: "unread",
    });
    expect(other.items.length).toBeGreaterThan(0);
  });

  it("markAllRead sem scope marca tudo", async () => {
    const repo = createLocalActivityRepository({ events: FIXTURES });
    await repo.markAllRead();
    const res = await repo.list({ tab: "unread" });
    expect(res.items.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run, verificar falha**

Run: `npx vitest run src/features/activity/repository/local.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementação**

Criar `src/features/activity/repository/local.ts`:

```ts
import type {
  ActivityEvent,
  ActivityListInput,
  ActivityListResult,
  ActivityRepository,
  ActivityTab,
} from "./types";
import type { Scope } from "@/features/scope/useScope";

const STORAGE_KEY = "zivy.activity.reads";

function safeRead(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function safeWrite(reads: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reads));
  } catch {
    // Safari Private Browsing pode lançar — ignorar
  }
}

function matchScope(event: ActivityEvent, scope?: Scope): boolean {
  if (!scope || scope.kind === "all") return true;
  return event.condoId === scope.condoId;
}

function applyReads(events: ActivityEvent[], reads: Record<string, string>): ActivityEvent[] {
  return events.map((e) => {
    const persisted = reads[e.id];
    if (persisted) return { ...e, readAt: persisted };
    return e;
  });
}

function matchTab(event: ActivityEvent, tab: ActivityTab): boolean {
  if (tab === "all") return true;
  if (tab === "unread") return event.readAt === null;
  if (tab === "approvals") return event.kind === "approval";
  return true;
}

export function createLocalActivityRepository(opts: {
  events: ActivityEvent[];
}): ActivityRepository {
  let base = [...opts.events];

  async function list(input: ActivityListInput): Promise<ActivityListResult> {
    const reads = safeRead();
    const withReads = applyReads(base, reads);
    const scoped = withReads.filter((e) => matchScope(e, input.scope));
    const sorted = [...scoped].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));

    const counts: Record<ActivityTab, number> = {
      all: scoped.length,
      unread: scoped.filter((e) => e.readAt === null).length,
      approvals: scoped.filter((e) => e.kind === "approval").length,
    };

    const tab: ActivityTab = input.tab ?? "all";
    const filtered = sorted.filter((e) => matchTab(e, tab));
    const limit = input.limit ?? 50;
    return { items: filtered.slice(0, limit), counts };
  }

  async function markRead(id: string): Promise<void> {
    const reads = safeRead();
    reads[id] = new Date().toISOString();
    safeWrite(reads);
    base = base.map((e) =>
      e.id === id && e.readAt === null ? { ...e, readAt: reads[id] ?? null } : e,
    );
  }

  async function markAllRead(scope?: Scope): Promise<void> {
    const reads = safeRead();
    const now = new Date().toISOString();
    for (const e of base) {
      if (e.readAt !== null) continue;
      if (!matchScope(e, scope)) continue;
      reads[e.id] = now;
    }
    safeWrite(reads);
    base = base.map((e) =>
      e.readAt === null && matchScope(e, scope) ? { ...e, readAt: reads[e.id] ?? null } : e,
    );
  }

  return { list, markRead, markAllRead };
}
```

- [ ] **Step 4: Run, verificar pass**

Run: `npx vitest run src/features/activity/repository/local.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/activity/repository/local.ts src/features/activity/repository/local.test.ts
git commit -m "feat(activity): LocalActivityRepository (in-memory + localStorage)"
```

---

### Task 19: Factory + Provider + hook

**Files:**

- Create: `src/features/activity/repository/index.ts`
- Create: `src/features/activity/RepositoryProvider.tsx`
- Create: `src/features/activity/useActivityRepository.ts`
- Modify: `src/app/providers.tsx`

- [ ] **Step 1: `repository/index.ts`**

```ts
import { FIXTURES } from "./fixtures";
import { createLocalActivityRepository } from "./local";
import type { ActivityRepository } from "./types";

export function createActivityRepository(): ActivityRepository {
  // Slice 5.4 estende com `if (env.ACTIVITY_REPOSITORY === "http")` → HttpActivityRepository.
  return createLocalActivityRepository({ events: FIXTURES });
}
```

- [ ] **Step 2: `RepositoryProvider.tsx`**

```tsx
import { createContext, useMemo, type ReactNode } from "react";
import { createActivityRepository } from "./repository";
import type { ActivityRepository } from "./repository/types";

export const RepositoryContext = createContext<ActivityRepository | null>(null);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const repo = useMemo(() => createActivityRepository(), []);
  return <RepositoryContext.Provider value={repo}>{children}</RepositoryContext.Provider>;
}
```

- [ ] **Step 3: `useActivityRepository.ts`**

```ts
import { useContext } from "react";
import { RepositoryContext } from "./RepositoryProvider";

export function useActivityRepository() {
  const ctx = useContext(RepositoryContext);
  if (!ctx) {
    throw new Error("useActivityRepository: RepositoryProvider ausente na árvore");
  }
  return ctx;
}
```

- [ ] **Step 4: Plugar no `app/providers.tsx`**

Editar `src/app/providers.tsx` para envelopar children com `<RepositoryProvider>`. Manter ordem: `QueryClientProvider` → `RepositoryProvider` → resto.

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/features/activity/repository/index.ts src/features/activity/RepositoryProvider.tsx src/features/activity/useActivityRepository.ts src/app/providers.tsx
git commit -m "feat(activity): factory + RepositoryProvider"
```

---

### Task 20: Hook `useActivityFeed`

**Files:**

- Create: `src/features/activity/useActivityFeed.ts`
- Create: `src/features/activity/useActivityFeed.test.tsx`

Wrapper de `useQuery` em torno do repository. Polling 30s, refetch on focus.

- [ ] **Step 1: Test failing**

```tsx
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { RepositoryContext } from "./RepositoryProvider";
import { createLocalActivityRepository } from "./repository/local";
import { FIXTURES } from "./repository/fixtures";
import { useActivityFeed } from "./useActivityFeed";

function wrapper({ children }: { children: ReactNode }) {
  const repo = createLocalActivityRepository({ events: FIXTURES });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <RepositoryContext.Provider value={repo}>{children}</RepositoryContext.Provider>
    </QueryClientProvider>
  );
}

describe("useActivityFeed", () => {
  it("retorna lista e counts", async () => {
    const { result } = renderHook(() => useActivityFeed({ tab: "all" }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items.length).toBeGreaterThan(0);
    expect(result.current.data?.counts.all).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run, verificar falha**

- [ ] **Step 3: Implementação**

```ts
import { useQuery } from "@tanstack/react-query";
import { useActivityRepository } from "./useActivityRepository";
import type { ActivityListInput, ActivityListResult } from "./repository/types";

export function useActivityFeed(input: ActivityListInput) {
  const repo = useActivityRepository();
  const scopeKey = input.scope?.kind === "condo" ? input.scope.condoId : "all";
  return useQuery<ActivityListResult>({
    queryKey: ["activity", scopeKey, input.tab ?? "all"],
    queryFn: () => repo.list(input),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}
```

- [ ] **Step 4: Pass + commit**

```bash
npx vitest run src/features/activity/useActivityFeed.test.tsx
git add src/features/activity/useActivityFeed.ts src/features/activity/useActivityFeed.test.tsx
git commit -m "feat(activity): hook useActivityFeed (React Query)"
```

---

### Task 21: Hook `useMarkRead`

**Files:**

- Create: `src/features/activity/useMarkRead.ts`
- Create: `src/features/activity/useMarkRead.test.tsx`

`useMutation` para `markRead` e `markAllRead`. Invalida queries de `activity` após sucesso.

- [ ] **Step 1: Test failing**

```tsx
import { describe, expect, it } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { RepositoryContext } from "./RepositoryProvider";
import { createLocalActivityRepository } from "./repository/local";
import { FIXTURES } from "./repository/fixtures";
import { useMarkRead } from "./useMarkRead";

function makeWrapper() {
  const repo = createLocalActivityRepository({ events: FIXTURES });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <RepositoryContext.Provider value={repo}>{children}</RepositoryContext.Provider>
      </QueryClientProvider>
    );
  }
  return { Wrapper, repo, qc };
}

describe("useMarkRead", () => {
  it("chama repo.markRead", async () => {
    const { Wrapper, repo } = makeWrapper();
    const { result } = renderHook(() => useMarkRead(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.markRead("ev-1");
    });
    const res = await repo.list({ tab: "unread" });
    expect(res.items.find((e) => e.id === "ev-1")).toBeUndefined();
  });

  it("markAllRead respeita scope", async () => {
    const { Wrapper, repo } = makeWrapper();
    const { result } = renderHook(() => useMarkRead(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.markAllRead({ kind: "condo", condoId: "c-jardins" });
    });
    const res = await repo.list({ scope: { kind: "condo", condoId: "c-jardins" }, tab: "unread" });
    expect(res.items.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run, verificar falha**

- [ ] **Step 3: Implementação**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useActivityRepository } from "./useActivityRepository";
import type { Scope } from "@/features/scope/useScope";

export function useMarkRead() {
  const repo = useActivityRepository();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async (input: { type: "one"; id: string } | { type: "all"; scope?: Scope }) => {
      if (input.type === "one") return repo.markRead(input.id);
      return repo.markAllRead(input.scope);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activity"] }),
  });
  return {
    markRead: async (id: string) => m.mutateAsync({ type: "one", id }),
    markAllRead: async (scope?: Scope) => m.mutateAsync({ type: "all", scope }),
    isPending: m.isPending,
  };
}
```

- [ ] **Step 4: Pass + commit**

```bash
npx vitest run src/features/activity/useMarkRead.test.tsx
git add src/features/activity/useMarkRead.ts src/features/activity/useMarkRead.test.tsx
git commit -m "feat(activity): hook useMarkRead (mutation + invalidação)"
```

---

### Task 22: Helpers de ícone/paleta

**Files:**

- Create: `src/features/activity/activityIcon.ts`
- Create: `src/features/activity/activityPalette.ts`

**Referência:** `docs/handoff/zivy-wa-green/project/src/page-inbox.jsx:15–20` (`KIND_ICON`).

- [ ] **Step 1: `activityIcon.ts` — mapping completo (ícone + bg + fg por kind)**

```ts
import { Bell, Send, Shield, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityKind } from "./repository/types";

export interface KindVisual {
  icon: LucideIcon;
  bg: string; // var(--token)
  fg: string; // var(--token)
}

const MAP: Record<ActivityKind, KindVisual> = {
  ticket_new: { icon: Bell, bg: "var(--info-bg)", fg: "var(--info-fg)" },
  ticket_comment: { icon: Send, bg: "var(--brand-soft)", fg: "var(--brand)" },
  approval: { icon: Shield, bg: "var(--status-onhold-bg)", fg: "var(--status-onhold-fg)" },
  status_change: { icon: Check, bg: "var(--status-media-bg)", fg: "var(--status-media-fg)" },
};

export function visualFor(kind: ActivityKind): KindVisual {
  return MAP[kind];
}
```

- [ ] **Step 2: `activityPalette.ts` — flag de "urgent" e helper de unread**

```ts
import type { ActivityEvent } from "./repository/types";

export function isUrgent(event: ActivityEvent): boolean {
  return event.kind === "ticket_new" && event.priority === "urgent";
}

export function isUnread(event: ActivityEvent): boolean {
  return event.readAt === null;
}
```

> No handoff a "barra lateral colorida" do `.inbox-item.unread` é fixa em `var(--brand)` (border-left 3px). Priority/urgency aparece como **badge** no header do item ("Novo", "Urgente"), não na barra. Ver `page-inbox.jsx` e `styles.css:706–720`.

- [ ] **Step 3: Commit**

```bash
git add src/features/activity/activityIcon.ts src/features/activity/activityPalette.ts
git commit -m "feat(activity): helpers de ícone e paleta de barra"
```

---

### Task 23: `ActivityItem`

**Files:**

- Create: `src/features/activity/ActivityItem.tsx`
- Create: `src/features/activity/ActivityItem.module.css`
- Create: `src/features/activity/ActivityItem.test.tsx`

Item visual conforme spec. Click no card chama `onPick(event)`. Hover ✓ chama `onMarkRead(id)`.

- [ ] **Step 1: Test failing**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivityItem } from "./ActivityItem";
import type { ActivityEvent } from "./repository/types";

const ev: ActivityEvent = {
  id: "ev-1",
  kind: "ticket_new",
  condoId: "c-1",
  condoName: "Cond Y",
  title: "Câmera offline",
  subtitle: "Cond Y",
  resourceRef: { type: "ticket", ticketId: "tk-1" },
  priority: "high",
  occurredAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  readAt: null,
};

describe("ActivityItem", () => {
  it("renderiza título, subtítulo e timestamp", () => {
    render(<ActivityItem event={ev} onPick={() => {}} onMarkRead={() => {}} />);
    expect(screen.getByText("Câmera offline")).toBeInTheDocument();
    expect(screen.getByText("Cond Y")).toBeInTheDocument();
  });

  it("click no card chama onPick com o evento", async () => {
    const onPick = vi.fn();
    render(<ActivityItem event={ev} onPick={onPick} onMarkRead={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Câmera offline/i }));
    expect(onPick).toHaveBeenCalledWith(ev);
  });

  it("botão ✓ chama onMarkRead com id", async () => {
    const onMarkRead = vi.fn();
    render(<ActivityItem event={ev} onPick={() => {}} onMarkRead={onMarkRead} />);
    await userEvent.click(screen.getByRole("button", { name: /marcar como lido/i }));
    expect(onMarkRead).toHaveBeenCalledWith("ev-1");
  });

  it("não mostra botão ✓ se já está lido", () => {
    const read = { ...ev, readAt: new Date().toISOString() };
    render(<ActivityItem event={read} onPick={() => {}} onMarkRead={() => {}} />);
    expect(screen.queryByRole("button", { name: /marcar como lido/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, verificar falha**

**Anatomia (handoff `styles.css:706–720` + `page-inbox.jsx`):** `.inbox-item` é uma linha clickável com 36×36 `.ii-icon` (cor por kind via `KIND_ICON`), `.ii-body` (head + sub), `.ii-time` à direita, e `border-left: 3px var(--brand)` quando `unread`. Badge "Novo" / "Urgente" aparece dentro do `.ii-head` (não na barra).

- [ ] **Step 3: CSS (escopado em CSS Modules — mesma visual de `.inbox-item`)**

```css
.row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  cursor: pointer;
  background: transparent;
  border: none;
  border-left: 3px solid transparent;
  border-bottom: 1px solid var(--border);
  width: 100%;
  text-align: left;
  font: inherit;
  position: relative;
}

.row:last-child {
  border-bottom: none;
}

.row:hover {
  background-color: var(--bg-muted);
}

.unread {
  border-left-color: var(--brand);
}

.iconBox {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.body {
  flex: 1;
  min-width: 0;
}

.head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-1);
}

.title {
  color: var(--fg-primary);
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  margin: 0;
}

.unread .title {
  font-weight: var(--fw-semibold);
}

.badge {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-pill);
  font-size: var(--fs-xs);
  font-weight: var(--fw-medium);
  background-color: var(--brand-soft);
  color: var(--brand);
}

.badgeUrgent {
  background-color: var(--status-urgent-bg);
  color: var(--status-urgent-fg);
}

.time {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--fg-tertiary);
  white-space: nowrap;
}

.sub {
  font-size: var(--fs-xs);
  color: var(--fg-tertiary);
  margin: 0;
}

.markBtn {
  display: none;
  position: absolute;
  right: var(--space-4);
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--fg-secondary);
  cursor: pointer;
}

.row:hover .markBtn {
  display: inline-flex;
}
```

- [ ] **Step 4: TSX**

```tsx
import { Check } from "lucide-react";
import type { ActivityEvent } from "./repository/types";
import { visualFor } from "./activityIcon";
import { isUnread, isUrgent } from "./activityPalette";
import { formatRelTime } from "@/features/inbox/formatRelTime";
import styles from "./ActivityItem.module.css";

interface Props {
  event: ActivityEvent;
  onPick: (event: ActivityEvent) => void;
  onMarkRead: (id: string) => void;
}

export function ActivityItem({ event, onPick, onMarkRead }: Props) {
  const visual = visualFor(event.kind);
  const Icon = visual.icon;
  const unread = isUnread(event);
  const urgent = isUrgent(event);
  const cls = [styles.row, unread ? styles.unread : ""].filter(Boolean).join(" ");

  return (
    <button type="button" className={cls} onClick={() => onPick(event)} aria-label={event.title}>
      <span
        className={styles.iconBox}
        style={{ backgroundColor: visual.bg, color: visual.fg }}
        aria-hidden="true"
      >
        <Icon size={18} />
      </span>
      <div className={styles.body}>
        <div className={styles.head}>
          <p className={styles.title}>{event.title}</p>
          {urgent ? <span className={`${styles.badge} ${styles.badgeUrgent}`}>Urgente</span> : null}
          {unread && !urgent ? <span className={styles.badge}>Novo</span> : null}
          <span className={styles.time}>{formatRelTime(event.occurredAt)}</span>
        </div>
        {event.subtitle ? <p className={styles.sub}>{event.subtitle}</p> : null}
      </div>
      {unread ? (
        <span
          role="button"
          tabIndex={0}
          aria-label="Marcar como lido"
          className={styles.markBtn}
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(event.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onMarkRead(event.id);
            }
          }}
        >
          <Check size={14} />
        </span>
      ) : null}
    </button>
  );
}
```

> O botão "Marcar como lido" usa `<span role="button">` porque HTML não permite `<button>` aninhado.

- [ ] **Step 5: Pass + commit**

```bash
npx vitest run src/features/activity/ActivityItem.test.tsx
git add src/features/activity/ActivityItem.tsx src/features/activity/ActivityItem.module.css src/features/activity/ActivityItem.test.tsx
git commit -m "feat(activity): ActivityItem (presentational + hover ✓)"
```

---

### Task 24: `ActivityFeedTabs`

**Files:**

- Create: `src/features/activity/ActivityFeedTabs.tsx`
- Create: `src/features/activity/ActivityFeedTabs.module.css`
- Create: `src/features/activity/ActivityFeedTabs.test.tsx`

Tabs com contadores. Recebe `value` e `onChange` + `counts`.

- [ ] **Step 1: Test failing**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivityFeedTabs } from "./ActivityFeedTabs";

const counts = { all: 8, unread: 3, approvals: 2 };

describe("ActivityFeedTabs", () => {
  it("renderiza três tabs com contadores", () => {
    render(<ActivityFeedTabs value="all" counts={counts} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /Todos.*8/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Não lidos.*3/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aprovações.*2/i })).toBeInTheDocument();
  });

  it("destaca a tab ativa", () => {
    render(<ActivityFeedTabs value="unread" counts={counts} onChange={() => {}} />);
    const btn = screen.getByRole("button", { name: /Não lidos.*3/i });
    expect(btn.className).toContain("active");
  });

  it("click chama onChange", async () => {
    const onChange = vi.fn();
    render(<ActivityFeedTabs value="all" counts={counts} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Aprovações/i }));
    expect(onChange).toHaveBeenCalledWith("approvals");
  });
});
```

- [ ] **Step 2: Run, verificar falha**

- [ ] **Step 3: CSS**

```css
.tabs {
  display: inline-flex;
  gap: var(--space-2);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--space-4);
}

.tab {
  background: transparent;
  border: none;
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  font-size: var(--fs-sm);
  color: var(--fg-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tab:hover {
  color: var(--fg-primary);
}

.active {
  color: var(--brand);
  border-bottom-color: var(--brand);
  font-weight: var(--fw-medium);
}

.badge {
  margin-left: var(--space-2);
  background-color: var(--bg-muted);
  color: var(--fg-secondary);
  border-radius: var(--radius-sm);
  padding: 0 6px;
  font-size: var(--fs-xs);
  font-variant-numeric: tabular-nums;
}

.active .badge {
  background-color: var(--brand);
  color: var(--fg-inverse);
}
```

- [ ] **Step 4: TSX**

```tsx
import type { ActivityTab } from "./repository/types";
import styles from "./ActivityFeedTabs.module.css";

interface Props {
  value: ActivityTab;
  counts: Record<ActivityTab, number>;
  onChange: (next: ActivityTab) => void;
}

const TABS: ReadonlyArray<{ value: ActivityTab; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "unread", label: "Não lidos" },
  { value: "approvals", label: "Aprovações" },
];

export function ActivityFeedTabs({ value, counts, onChange }: Props) {
  return (
    <div className={styles.tabs} role="tablist">
      {TABS.map((t) => {
        const active = value === t.value;
        const cls = [styles.tab, active ? styles.active : ""].filter(Boolean).join(" ");
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cls}
            onClick={() => onChange(t.value)}
          >
            {t.label}
            <span className={styles.badge}>{counts[t.value]}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Pass + commit**

```bash
npx vitest run src/features/activity/ActivityFeedTabs.test.tsx
git add src/features/activity/ActivityFeedTabs.tsx src/features/activity/ActivityFeedTabs.module.css src/features/activity/ActivityFeedTabs.test.tsx
git commit -m "feat(activity): ActivityFeedTabs com contadores"
```

---

### Task 25: `ActivityFeed`

**Files:**

- Create: `src/features/activity/ActivityFeed.tsx`
- Create: `src/features/activity/ActivityFeed.module.css`
- Create: `src/features/activity/ActivityFeed.test.tsx`

Composição: header com "X não lidos" + botão "Marcar tudo como lido" + tabs + lista + estados. Tab em `searchParams` (`?tab=`). Navegação no click do item via `useNavigate` + `resourceRef`.

- [ ] **Step 1: Test failing**

```tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityFeed } from "./ActivityFeed";
import { RepositoryContext } from "./RepositoryProvider";
import { createLocalActivityRepository } from "./repository/local";
import { FIXTURES } from "./repository/fixtures";

const mockNavigate = vi.fn();
const mockSearch: { tab?: string } = {};
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearch,
}));

afterEach(() => {
  vi.restoreAllMocks();
  mockNavigate.mockReset();
  for (const k of Object.keys(mockSearch)) delete (mockSearch as Record<string, unknown>)[k];
  localStorage.clear();
});

function setup() {
  const repo = createLocalActivityRepository({ events: FIXTURES });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    repo,
    ui: (
      <QueryClientProvider client={qc}>
        <RepositoryContext.Provider value={repo}>
          <ActivityFeed scope={{ kind: "all" }} />
        </RepositoryContext.Provider>
      </QueryClientProvider>
    ),
  };
}

describe("ActivityFeed", () => {
  it("renderiza header com contagem de não lidos", async () => {
    const { ui } = setup();
    render(ui);
    await waitFor(() => expect(screen.getByText(/não lidos/i)).toBeInTheDocument());
  });

  it("click em item navega para o resource", async () => {
    const { ui } = setup();
    render(ui);
    await waitFor(() => screen.getAllByRole("button"));
    const first = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-label")?.includes("Câmera"));
    await userEvent.click(first as HTMLElement);
    expect(mockNavigate).toHaveBeenCalled();
  });

  it("marcar tudo como lido limpa contagem de unread", async () => {
    const { ui } = setup();
    render(ui);
    const btn = await screen.findByRole("button", { name: /Marcar tudo como lido/i });
    await userEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText(/^0 não lidos/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run, verificar falha**

- [ ] **Step 3: CSS**

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

.actions {
  display: flex;
  gap: var(--space-2);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.empty {
  padding: var(--space-8);
  text-align: center;
  color: var(--fg-tertiary);
}
```

- [ ] **Step 4: TSX**

```tsx
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/ui/Button/Button";
import { Spinner } from "@/ui/Spinner/Spinner";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import type { Scope } from "@/features/scope/useScope";
import { useActivityFeed } from "./useActivityFeed";
import { useMarkRead } from "./useMarkRead";
import { ActivityFeedTabs } from "./ActivityFeedTabs";
import { ActivityItem } from "./ActivityItem";
import type { ActivityEvent, ActivityTab } from "./repository/types";
import styles from "./ActivityFeed.module.css";

interface Props {
  scope: Scope;
}

export function ActivityFeed({ scope }: Props) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { tab?: ActivityTab };
  const tab: ActivityTab = search.tab ?? "all";
  const { data, isPending, isError, refetch } = useActivityFeed({ scope, tab });
  const { markRead, markAllRead } = useMarkRead();

  if (isPending) {
    return (
      <>
        <Header subtitle="Carregando…" />
        <Spinner />
      </>
    );
  }

  if (isError || !data) {
    return (
      <>
        <Header subtitle="" />
        <div className={styles.empty}>
          <p>Não foi possível carregar a inbox.</p>
          <Button onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      </>
    );
  }

  function handleTabChange(next: ActivityTab) {
    void navigate({ to: ".", search: { tab: next } } as unknown as Parameters<typeof navigate>[0]);
  }

  function handlePick(event: ActivityEvent) {
    const ref = event.resourceRef;
    if (ref.type === "ticket") {
      const target =
        scope.kind === "condo"
          ? {
              to: "/c/$condoId/inbox/$ticketId",
              params: { condoId: scope.condoId, ticketId: ref.ticketId },
            }
          : {
              to: "/c/$condoId/inbox/$ticketId",
              params: { condoId: event.condoId, ticketId: ref.ticketId },
            };
      void navigate(target as unknown as Parameters<typeof navigate>[0]);
      return;
    }
    if (ref.type === "resident_approval") {
      void navigate({
        to: "/c/$condoId/approvals",
        params: { condoId: event.condoId },
        search: { highlight: ref.residentId },
      } as unknown as Parameters<typeof navigate>[0]);
    }
  }

  return (
    <>
      <Header
        subtitle={`${data.counts.unread} não lidos`}
        actions={<Button onClick={() => markAllRead(scope)}>Marcar tudo como lido</Button>}
      />
      <ActivityFeedTabs value={tab} counts={data.counts} onChange={handleTabChange} />
      {data.items.length === 0 ? (
        <EmptyState title="Tudo em dia" description="Nenhuma atividade neste recorte." />
      ) : (
        <div className={styles.list}>
          {data.items.map((ev) => (
            <ActivityItem key={ev.id} event={ev} onPick={handlePick} onMarkRead={markRead} />
          ))}
        </div>
      )}
    </>
  );
}

function Header({ subtitle, actions }: { subtitle: string; actions?: React.ReactNode }) {
  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>Inbox</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
```

- [ ] **Step 5: Pass + commit**

```bash
npx vitest run src/features/activity/ActivityFeed.test.tsx
git add src/features/activity/ActivityFeed.tsx src/features/activity/ActivityFeed.module.css src/features/activity/ActivityFeed.test.tsx
git commit -m "feat(activity): ActivityFeed (header + tabs + lista + marcar tudo)"
```

---

### Task 26: Plugar `ActivityFeed` nas rotas `/inbox` e `/c/$id/inbox`

**Files:**

- Modify: `src/app/routes/_app/inbox.tsx`
- Modify: `src/app/routes/_app/c/$condoId/inbox.tsx`
- Auto-update: `src/app/routeTree.gen.ts`

`InboxPage` do Plan 4.2 é substituída pelo `ActivityFeed` (ela vivia em `src/features/inbox/InboxPage.tsx` — manter por enquanto, mas as rotas param de usar).

- [ ] **Step 1: Editar `/_app/inbox.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { ActivityFeed } from "@/features/activity/ActivityFeed";

export const Route = createFileRoute("/_app/inbox")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search.tab === "unread" || search.tab === "approvals" ? search.tab : ("all" as const),
  }),
  component: () => <ActivityFeed scope={{ kind: "all" }} />,
});
```

- [ ] **Step 2: Editar `/_app/c/$condoId/inbox.tsx`**

Substituir conteúdo atual (que usa `InboxPage` do Plan 4.2):

```tsx
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ActivityFeed } from "@/features/activity/ActivityFeed";

export const Route = createFileRoute("/_app/c/$condoId/inbox")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: search.tab === "unread" || search.tab === "approvals" ? search.tab : ("all" as const),
  }),
  component: InboxRoute,
});

function InboxRoute() {
  const { condoId } = Route.useParams();
  return (
    <>
      <ActivityFeed scope={{ kind: "condo", condoId }} />
      <Outlet />
    </>
  );
}
```

- [ ] **Step 3: Regenerar routeTree**

Run: `npm run dev` (aguardar "Generated route tree" e parar).

- [ ] **Step 4: Suite + commit**

```bash
npm run typecheck && npm run test
git add src/app/routes/_app/inbox.tsx src/app/routes/_app/c/$condoId/inbox.tsx src/app/routeTree.gen.ts
git commit -m "feat(activity): plugar ActivityFeed em /inbox e /c/\$id/inbox"
```

---

### Task 27: Sidebar badge — passar contador de unread

**Files:**

- Modify: `src/ui/AppShell/AppShell.tsx`

`Sidebar` aceita `inboxUnreadCount`. `AppShell` chama `useActivityFeed({ scope, tab: "unread" })` e passa o `counts.unread`.

- [ ] **Step 1: Editar `AppShell.tsx`**

Adicionar antes do return:

```tsx
import { useActivityFeed } from "@/features/activity/useActivityFeed";
// ...
const unread = useActivityFeed({ scope, tab: "unread" });
const inboxUnreadCount = unread.data?.counts.unread;
```

E no `<Sidebar>`:

```tsx
<Sidebar
  scope={scope}
  scopeTitle={scopeTitle}
  {...(scopeSubtitle ? { scopeSubtitle } : {})}
  {...(typeof inboxUnreadCount === "number" ? { inboxUnreadCount } : {})}
/>
```

- [ ] **Step 2: Atualizar `AppShell.test.tsx`**

Adicionar mock para `useActivityFeed`:

```tsx
vi.mock("@/features/activity/useActivityFeed", () => ({
  useActivityFeed: () => ({
    data: { counts: { all: 8, unread: 3, approvals: 2 }, items: [] },
    isPending: false,
  }),
}));
```

- [ ] **Step 3: Suite + commit**

```bash
npm run typecheck && npm run test
git add src/ui/AppShell/AppShell.tsx src/ui/AppShell/AppShell.test.tsx
git commit -m "feat(activity): sidebar mostra badge de unread"
```

---

### Task 28: Slice 5.2 — fechar PR

- [ ] **Step 1: Suite completa + build**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: verde.

- [ ] **Step 2: Smoke manual**

```bash
npm run dev
```

Validar:

- `/inbox`: feed cross-condo com 12 fixtures, ordenado por tempo.
- Tabs Todos/Não lidos/Aprovações alternam conteúdo, badge de count correto.
- Hover ✓ marca como lido (item perde fundo destacado, badge atualiza).
- "Marcar tudo como lido" zera unread.
- Click num item de ticket vai para `/c/$id/inbox/$ticketId` (modal de 4.3 abre, se 4.3 mergeada — senão fica em 404, mas o navigate dispara).
- Click num item de approval vai para `/c/$id/approvals?highlight=...` (página existe, ignora highlight por enquanto).
- Sidebar mostra badge de "3" (ou contagem atual) ao lado de "Inbox".
- Recarregar mantém estado de leitura (localStorage).
- Reload em `/inbox?tab=approvals` mantém a tab.

Parar (Ctrl+C).

- [ ] **Step 3: Push e abrir PR**

```bash
git push -u origin feature/plan-5-2-activity-feed
gh pr create --base develop --title "feat(plan-5): activity feed unificado (adapter local)" --body "$(cat <<'EOF'
## Summary
- `ActivityRepository` (interface) + `LocalActivityRepository` (in-memory + localStorage para read state).
- 12 fixtures determinísticas cobrindo todos os `kind`s.
- `ActivityFeed` substitui placeholder de `/inbox` e a `InboxPage` do Plan 4.2 em `/c/\$id/inbox`.
- Tabs Todos/Não lidos/Aprovações com contadores; "Marcar tudo como lido" e hover ✓ funcionando.
- Sidebar item "Inbox" ganha badge de unread.
- Click em item navega: ticket → `/c/\$id/inbox/\$ticketId` (modal 4.3); approval → `/c/\$id/approvals?highlight=\$id`.

Próximo: Slice 5.3 (role guards) e 5.4 (HTTP adapter).

## Test plan
- [ ] CI verde.
- [ ] Smoke manual em preview Vercel: feed local funcional, leitura persiste em refresh.
- [ ] Tab via search param sobrevive reload.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

# Slice 5.3 — Role guards + visibilidade da sidebar

**Branch:** `feature/plan-5-3-role-guards` (sair de `develop` atualizada com 5.2 mergeada)
**PR:** contra `develop`
**Escopo:** aplicar `useRoleGuard` (Plan 3.3) nas rotas novas que exigem role privilegiado; esconder itens da sidebar conforme role; ajustar `RoleBadge` em scope "all" para usar `roleHierarchy`.

---

### Task 29: Guard de `/approvals` (cross e per-condo)

**Files:**

- Modify: `src/app/routes/_app/approvals.tsx`
- Modify: `src/app/routes/_app/c/$condoId/approvals.tsx` (já existe do Plan 3)

Aprovações = admin ou sindico apenas.

- [ ] **Step 1: Editar `_app/approvals.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import { useRoleGuardAny } from "@/features/condo/useRoleGuard";

export const Route = createFileRoute("/_app/approvals")({
  component: ApprovalsRoute,
});

function ApprovalsRoute() {
  // Cross-condo: usuário precisa ser admin/sindico em pelo menos UM condo.
  useRoleGuardAny(["admin", "sindico"]);
  return <EmptyState title="Aprovações cross-condo" description="Em breve." />;
}
```

> Se `useRoleGuardAny` não existe ainda (Plan 3.3 usa `useRoleGuard` com `condoId`), criar essa variante: itera condos do `useMyCondos` e verifica se há pelo menos um com role permitido; senão `navigate({ to: "/no-access" })`.

- [ ] **Step 2: Criar `useRoleGuardAny`**

Editar `src/features/condo/useRoleGuard.ts` adicionando:

```ts
import type { Role } from "./roleHierarchy";
import { useMyCondos } from "./useMyCondos";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export function useRoleGuardAny(allowed: ReadonlyArray<Role>) {
  const { data: condos, isPending } = useMyCondos();
  const navigate = useNavigate();
  useEffect(() => {
    if (isPending) return;
    const has = (condos ?? []).some((c) => allowed.includes(c.role));
    if (!has) void navigate({ to: "/no-access" });
  }, [condos, isPending, allowed, navigate]);
}
```

- [ ] **Step 3: Guard per-condo (já implementado em Plan 3)**

Verificar que `/c/$condoId/approvals` já chama `useRoleGuard(condoId, ["admin","sindico"])`. Se não chamar, adicionar.

- [ ] **Step 4: Test `useRoleGuardAny`**

Criar/atualizar `src/features/condo/useRoleGuard.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRoleGuardAny } from "./useRoleGuard";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mockNavigate }));

vi.mock("./useMyCondos", () => ({
  useMyCondos: vi.fn(),
}));

import { useMyCondos } from "./useMyCondos";

describe("useRoleGuardAny", () => {
  it("redireciona se nenhum condo tem role permitido", () => {
    vi.mocked(useMyCondos).mockReturnValue({
      data: [{ id: "c1", name: "X", role: "zelador" }],
      isPending: false,
    } as ReturnType<typeof useMyCondos>);
    mockNavigate.mockReset();
    renderHook(() => useRoleGuardAny(["admin", "sindico"]));
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/no-access" });
  });

  it("não redireciona se há pelo menos um condo permitido", () => {
    vi.mocked(useMyCondos).mockReturnValue({
      data: [
        { id: "c1", name: "X", role: "zelador" },
        { id: "c2", name: "Y", role: "sindico" },
      ],
      isPending: false,
    } as ReturnType<typeof useMyCondos>);
    mockNavigate.mockReset();
    renderHook(() => useRoleGuardAny(["admin", "sindico"]));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Pass + commit**

```bash
npx vitest run src/features/condo/useRoleGuard.test.ts
git add src/features/condo/useRoleGuard.ts src/features/condo/useRoleGuard.test.ts src/app/routes/_app/approvals.tsx src/app/routes/_app/c/$condoId/approvals.tsx
git commit -m "feat(plan-5): guard de role em /approvals (cross + per-condo)"
```

---

### Task 30: Guards de `/c/$id/structure/*`

**Files:**

- Modify: `src/app/routes/_app/c/$condoId/structure/blocks.tsx`
- Modify: `src/app/routes/_app/c/$condoId/structure/units.tsx`
- Modify: `src/app/routes/_app/c/$condoId/structure/common-areas.tsx`

Cada um chama `useRoleGuard(condoId, ["admin", "sindico"])`.

- [ ] **Step 1: Editar `blocks.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import { useRoleGuard } from "@/features/condo/useRoleGuard";

export const Route = createFileRoute("/_app/c/$condoId/structure/blocks")({
  component: Page,
});

function Page() {
  const { condoId } = Route.useParams();
  useRoleGuard(condoId, ["admin", "sindico"]);
  return <EmptyState title="Blocos" description="Em breve." />;
}
```

- [ ] **Step 2: Editar `units.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import { useRoleGuard } from "@/features/condo/useRoleGuard";

export const Route = createFileRoute("/_app/c/$condoId/structure/units")({
  component: Page,
});

function Page() {
  const { condoId } = Route.useParams();
  useRoleGuard(condoId, ["admin", "sindico"]);
  return <EmptyState title="Unidades" description="Em breve." />;
}
```

- [ ] **Step 2b: Editar `common-areas.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import { useRoleGuard } from "@/features/condo/useRoleGuard";

export const Route = createFileRoute("/_app/c/$condoId/structure/common-areas")({
  component: Page,
});

function Page() {
  const { condoId } = Route.useParams();
  useRoleGuard(condoId, ["admin", "sindico"]);
  return <EmptyState title="Áreas comuns" description="Em breve." />;
}
```

- [ ] **Step 3: Suite + commit**

```bash
npm run typecheck && npm run test
git add src/app/routes/_app/c/$condoId/structure/
git commit -m "feat(plan-5): guard de role em /structure/*"
```

---

### Task 31: Sidebar — esconder itens conforme role/scope

**Files:**

- Modify: `src/ui/AppShell/Sidebar/Sidebar.tsx`
- Modify: `src/ui/AppShell/AppShell.tsx`

`Sidebar` aceita prop `userRoles: Record<condoId, Role>` (para per-condo) + `aggregateRoles: Role[]` (para scope "all"). Item "Aprovações" e grupo "Estrutura" só renderizam se role permite.

- [ ] **Step 1: Adicionar props em `Sidebar.tsx`**

Acrescentar interface:

```ts
import type { Role } from "@/features/condo/roleHierarchy";

interface SidebarProps {
  // ... (existentes)
  currentRole?: Role; // role no scope atual; ausente em scope "all" — usar aggregateRoles
  aggregateRoles?: Role[]; // roles do user em todos os condos
}
```

Lógica:

```ts
function canApprovals(scope: Scope, currentRole?: Role, aggregate?: Role[]): boolean {
  const allowed: Role[] = ["admin", "sindico"];
  if (scope.kind === "condo") return currentRole !== undefined && allowed.includes(currentRole);
  return (aggregate ?? []).some((r) => allowed.includes(r));
}

function canStructure(scope: Scope, currentRole?: Role): boolean {
  if (scope.kind !== "condo") return false;
  return currentRole === "admin" || currentRole === "sindico";
}
```

Filtrar `operacao` para tirar item de aprovações se `!canApprovals(...)`. Renderizar `estrutura` somente se `canStructure(...)`.

- [ ] **Step 2: AppShell passa props**

```tsx
const aggregateRoles: Role[] = (condos ?? []).map((c) => c.role);
const currentRole =
  scope.kind === "condo" ? condos?.find((c) => c.id === scope.condoId)?.role : undefined;

<Sidebar
  scope={scope}
  scopeTitle={scopeTitle}
  {...(scopeSubtitle ? { scopeSubtitle } : {})}
  {...(typeof inboxUnreadCount === "number" ? { inboxUnreadCount } : {})}
  {...(currentRole ? { currentRole } : {})}
  aggregateRoles={aggregateRoles}
/>;
```

- [ ] **Step 3: Atualizar `Sidebar.test.tsx`**

Adicionar:

```tsx
it("esconde Aprovações para zelador", () => {
  render(<Sidebar scope={{ kind: "condo", condoId: "c1" }} scopeTitle="X" currentRole="zelador" />);
  expect(screen.queryByText(/Aprovações/i)).not.toBeInTheDocument();
});

it("esconde Estrutura para zelador", () => {
  render(<Sidebar scope={{ kind: "condo", condoId: "c1" }} scopeTitle="X" currentRole="zelador" />);
  expect(screen.queryByText(/Estrutura/i)).not.toBeInTheDocument();
});

it("mostra Aprovações em scope 'all' se aggregateRoles inclui admin", () => {
  render(
    <Sidebar scope={{ kind: "all" }} scopeTitle="Todos" aggregateRoles={["admin", "zelador"]} />,
  );
  expect(screen.getByText(/Aprovações/i)).toBeInTheDocument();
});
```

- [ ] **Step 4: Pass + commit**

```bash
npm run typecheck && npm run test
git add src/ui/AppShell/Sidebar/Sidebar.tsx src/ui/AppShell/Sidebar/Sidebar.test.tsx src/ui/AppShell/AppShell.tsx
git commit -m "feat(plan-5): sidebar esconde itens conforme role/scope"
```

---

### Task 32: RoleBadge — usar role do scope

**Files:**

- Modify: `src/ui/AppShell/AppShell.tsx`

Já existe `highestRole` em `AppShell.tsx` (Task 13). Reusar `roleHierarchy` para garantir consistência.

- [ ] **Step 1: Substituir `highestRole` por uso de `roleHierarchy`**

Editar `AppShell.tsx`:

```ts
import { compareRoles } from "@/features/condo/roleHierarchy";

function highestRole(roles: Role[]): Role {
  return [...roles].sort(compareRoles)[0] ?? "zelador";
}
```

> Se `roleHierarchy.ts` não exporta `compareRoles`, criar export `(a, b) => ROLE_ORDER[a] - ROLE_ORDER[b]` lá. Manter `ROLE_ORDER` único nesse módulo.

- [ ] **Step 2: Testar comparações**

Adicionar em `roleHierarchy.test.ts`:

```ts
import { compareRoles } from "./roleHierarchy";

it("compareRoles ordena admin < sindico < zelador", () => {
  const sorted = ["zelador", "sindico", "admin"].sort(compareRoles);
  expect(sorted).toEqual(["admin", "sindico", "zelador"]);
});
```

- [ ] **Step 3: Suite + commit**

```bash
npm run typecheck && npm run test
git add src/features/condo/roleHierarchy.ts src/features/condo/roleHierarchy.test.ts src/ui/AppShell/AppShell.tsx
git commit -m "feat(plan-5): RoleBadge usa roleHierarchy em scope 'all'"
```

---

### Task 33: Slice 5.3 — fechar PR

- [ ] **Step 1: Suite + build**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: verde.

- [ ] **Step 2: Smoke manual**

```bash
npm run dev
```

Validar com usuário zelador (em `useMyCondos` retornar role `zelador`):

- Não vê "Aprovações" na sidebar.
- Não vê "Estrutura".
- Tentar acessar `/c/$id/structure/blocks` redireciona para `/no-access`.
- Tentar acessar `/approvals` redireciona para `/no-access` (se nenhum condo tem role permitido).

Com admin/sindico:

- Tudo visível.

Parar (Ctrl+C).

- [ ] **Step 3: Push e PR**

```bash
git push -u origin feature/plan-5-3-role-guards
gh pr create --base develop --title "feat(plan-5): role guards + visibilidade da sidebar" --body "$(cat <<'EOF'
## Summary
- `useRoleGuardAny` para rotas cross-condo (`/approvals`).
- `useRoleGuard` em `/c/\$id/structure/*`.
- `Sidebar` esconde "Aprovações" e grupo "Estrutura" conforme role.
- `RoleBadge` em scope "all" usa `roleHierarchy.compareRoles`.

## Test plan
- [ ] CI verde.
- [ ] Smoke manual em preview: zelador não vê itens privilegiados; sindico/admin veem tudo; redirect para `/no-access` quando acesso direto à URL.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

# Slice 5.4 — HttpActivityRepository (gated)

**Branch:** `feature/plan-5-4-http-adapter` (sair de `develop` atualizada com 5.3 mergeada)
**PR:** contra `develop`
**Escopo:** implementação HTTP do adapter, atrás de flag `VITE_ACTIVITY_REPOSITORY`. Default permanece `local` até Core entregar o endpoint. Quando Core mergear, basta virar a flag em staging para validar.

---

### Task 34: Env var `ACTIVITY_REPOSITORY`

**Files:**

- Modify: `src/lib/env.ts`
- Modify: `.env.example`

- [ ] **Step 1: Adicionar em `src/lib/env.ts`**

```ts
const repo = import.meta.env.VITE_ACTIVITY_REPOSITORY as string | undefined;
const ACTIVITY_REPOSITORY: "local" | "http" = repo === "http" ? "http" : "local";

export const env = {
  // ... existentes
  ACTIVITY_REPOSITORY,
};
```

- [ ] **Step 2: Atualizar `.env.example`**

Adicionar:

```
# Plan 5.4: 'local' (default) ou 'http' (quando endpoint do Core estiver disponível)
VITE_ACTIVITY_REPOSITORY=local
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add src/lib/env.ts .env.example
git commit -m "feat(env): VITE_ACTIVITY_REPOSITORY (default local)"
```

---

### Task 35: `HttpActivityRepository`

**Files:**

- Create: `src/features/activity/repository/http.ts`
- Create: `src/features/activity/repository/http.test.ts`

Consome `api` (`openapi-fetch` instance em `src/api/client.ts`). Como o endpoint `/activity` ainda não existe no `openapi.json`, vamos usar `fetch` direto contra `${env.CORE_API_URL}/activity` por enquanto, com tipagem manual.

> **Quando Core mergear o endpoint:** rodar `npm run sync:swagger && npm run gen:api`; em seguida trocar `fetch` por `api.GET("/activity", ...)`. Issue de follow-up cobre.

- [ ] **Step 1: Test failing**

Criar `src/features/activity/repository/http.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { CORE_API_URL: "http://core.test" },
}));

vi.mock("@/api/auth", () => ({
  getAccessToken: vi.fn().mockResolvedValue("tok"),
}));

import { createHttpActivityRepository } from "./http";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("HttpActivityRepository", () => {
  it("GET /activity envia condo_id e tab", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items: [], counts: { all: 0, unread: 0, approvals: 0 } }), {
        status: 200,
      }),
    );
    const repo = createHttpActivityRepository();
    await repo.list({ scope: { kind: "condo", condoId: "c1" }, tab: "unread" });
    const url = String(spy.mock.calls[0]?.[0] ?? "");
    expect(url).toContain("condo_id=c1");
    expect(url).toContain("tab=unread");
  });

  it("POST /activity/{id}/read", async () => {
    const spy = vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    const repo = createHttpActivityRepository();
    await repo.markRead("ev-1");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/activity/ev-1/read"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
```

- [ ] **Step 2: Run, verificar falha**

- [ ] **Step 3: Implementação**

```ts
import type { ActivityListInput, ActivityListResult, ActivityRepository } from "./types";
import type { Scope } from "@/features/scope/useScope";
import { env } from "@/lib/env";
import { getAccessToken } from "@/api/auth";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function urlFor(input: ActivityListInput): string {
  const params = new URLSearchParams();
  if (input.scope?.kind === "condo") params.set("condo_id", input.scope.condoId);
  if (input.tab) params.set("tab", input.tab);
  if (input.cursor) params.set("cursor", input.cursor);
  if (typeof input.limit === "number") params.set("limit", String(input.limit));
  const q = params.toString();
  return `${env.CORE_API_URL}/activity${q ? `?${q}` : ""}`;
}

export function createHttpActivityRepository(): ActivityRepository {
  async function list(input: ActivityListInput): Promise<ActivityListResult> {
    const res = await fetch(urlFor(input), { headers: await authHeaders() });
    if (!res.ok) throw new Error(`HttpActivityRepository.list: HTTP ${res.status}`);
    return (await res.json()) as ActivityListResult;
  }
  async function markRead(id: string): Promise<void> {
    const res = await fetch(`${env.CORE_API_URL}/activity/${encodeURIComponent(id)}/read`, {
      method: "POST",
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`HttpActivityRepository.markRead: HTTP ${res.status}`);
  }
  async function markAllRead(scope?: Scope): Promise<void> {
    const body = scope?.kind === "condo" ? { condo_id: scope.condoId } : {};
    const res = await fetch(`${env.CORE_API_URL}/activity/read-all`, {
      method: "POST",
      headers: { ...(await authHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HttpActivityRepository.markAllRead: HTTP ${res.status}`);
  }
  return { list, markRead, markAllRead };
}
```

- [ ] **Step 4: Pass + commit**

```bash
npx vitest run src/features/activity/repository/http.test.ts
git add src/features/activity/repository/http.ts src/features/activity/repository/http.test.ts
git commit -m "feat(activity): HttpActivityRepository (gated)"
```

---

### Task 36: Factory escolhe adapter por env

**Files:**

- Modify: `src/features/activity/repository/index.ts`

- [ ] **Step 1: Editar**

```ts
import { env } from "@/lib/env";
import { FIXTURES } from "./fixtures";
import { createLocalActivityRepository } from "./local";
import { createHttpActivityRepository } from "./http";
import type { ActivityRepository } from "./types";

export function createActivityRepository(): ActivityRepository {
  if (env.ACTIVITY_REPOSITORY === "http") {
    return createHttpActivityRepository();
  }
  return createLocalActivityRepository({ events: FIXTURES });
}
```

- [ ] **Step 2: Suite + commit**

```bash
npm run typecheck && npm run test
git add src/features/activity/repository/index.ts
git commit -m "feat(activity): factory escolhe local vs http por env"
```

---

### Task 37: Slice 5.4 — fechar PR

- [ ] **Step 1: Suite + build**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Expected: verde.

- [ ] **Step 2: Smoke manual local**

```bash
# Com VITE_ACTIVITY_REPOSITORY=local (default)
npm run dev
```

Validar: feed continua com fixtures locais, igual ao Slice 5.2.

> **NÃO testar `http` ainda em produção** — endpoint do Core não existe. Validação `http` deve ser feita em staging quando Core mergear, em PR de follow-up que muda a env var.

- [ ] **Step 3: Push e PR**

```bash
git push -u origin feature/plan-5-4-http-adapter
gh pr create --base develop --title "feat(plan-5): HttpActivityRepository (gated, default local)" --body "$(cat <<'EOF'
## Summary
- `HttpActivityRepository` consumindo `/activity`, `/activity/{id}/read`, `/activity/read-all` via fetch direto + bearer token.
- Factory escolhe adapter por `VITE_ACTIVITY_REPOSITORY` (default \`local\`).
- Nenhuma mudança visual; \`local\` continua sendo o default em todos os ambientes.

Quando o Core mergear o endpoint:
1. Rodar \`npm run sync:swagger && npm run gen:api\` e migrar o adapter para usar \`api.GET\` tipado.
2. Setar \`VITE_ACTIVITY_REPOSITORY=http\` em staging.
3. Validar feed real, depois flip para produção.

## Test plan
- [ ] CI verde.
- [ ] Default \`local\` mantém comportamento anterior.
- [ ] Smoke manual: \`/inbox\` continua mostrando fixtures.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Summary

Plan 5 completo. Quatro PRs:

- 5.1: shell visual + rotas placeholder.
- 5.2: ActivityRepository local + ActivityFeed + plug em `/inbox` e `/c/$id/inbox`.
- 5.3: role guards + visibilidade da sidebar.
- 5.4: HTTP adapter gated.

## Test plan global

- [ ] Os 4 PRs passam CI individualmente.
- [ ] Após mergeados, smoke manual end-to-end: login → switcher "Todos" → feed cross-condo → click em ticket abre modal → marca como lido → tab "Não lidos" zera ao "Marcar tudo".
- [ ] Verificar com 3 usuários (admin, sindico, zelador) que visibilidade da sidebar e access control batem.

## Spec source

- ✅ Spec §Roteamento: Tasks 2, 12.
- ✅ Spec §Scope: Task 2.
- ✅ Spec §ActivityRepository: Tasks 16, 18, 19, 35, 36.
- ✅ Spec §Componentes/Shell: Tasks 3–9, 11, 13, 14.
- ✅ Spec §Activity Feed: Tasks 22–25, 27.
- ✅ Spec §Contrato Core: refletido em types.ts e http.ts (Tasks 16, 35).
- ✅ Spec §Slicing: Slices 5.1–5.4.
- ✅ Spec §Estratégia de testes: testes em cada componente + integrados com `LocalActivityRepository` real.
- ✅ Spec §Padrões reaproveitados: convenções top do documento.
- ✅ Spec §Fora de escopo: Task 9 (busca visual), placeholders sem CRUD.
- ✅ Spec §Riscos: HTTP adapter atrás de flag (Task 36), regressão coberta por Plan 4 continuar verde após Slice 5.1.
