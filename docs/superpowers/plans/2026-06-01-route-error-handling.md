# Tratamento de erro no carregamento de rotas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar um `defaultErrorComponent` global no TanStack Router que distinga falha de conexão (com botão "Tentar novamente") de erro desconhecido (com "Recarregar"), substituindo o fallback pelado atual.

**Architecture:** Três unidades isoladas — um classificador puro de erro (`classifyRouteError`), uma tela de erro (`RouteError`) que reusa `EmptyState` (estendido com slot de ação) + `Button`, e o registro do componente como `defaultErrorComponent` no router. O retry chama `router.invalidate()`, que re-executa os `beforeLoad`/`loader` correntes.

**Tech Stack:** TanStack Router (`createRouter`, `defaultErrorComponent`, `useRouter`), React 19, Vitest + Testing Library, CSS Modules.

**Spec:** `docs/superpowers/specs/2026-06-01-route-error-handling-design.md`

**Branch:** `feature/route-error-handling` (já criada, com a spec commitada).

---

## File Structure

**Create:**

- `src/lib/routeError.ts` — classificador puro `classifyRouteError(error): "connection" | "unknown"`. Sem import de env, testável em CI.
- `src/lib/routeError.test.ts` — unitário do classificador.
- `src/ui/AppShell/RouteError.tsx` — tela de erro (`defaultErrorComponent`).
- `src/ui/AppShell/RouteError.test.tsx` — teste unitário do componente (mocka `useRouter`).
- `src/ui/AppShell/RouteError.integration.test.tsx` — teste com router real (verifica captura no `beforeLoad` + retry).
- `src/ui/AppShell/EmptyState.test.tsx` — teste do `EmptyState` (não existia).

**Modify:**

- `src/ui/AppShell/EmptyState.tsx` — slot opcional `action?: ReactNode`.
- `src/app/router.tsx` — registra `defaultErrorComponent: RouteError`.

---

## Convenções recorrentes (releitura obrigatória)

- **Tipagem honesta** (CLAUDE.md): sem `any`/`as any`/`@ts-ignore`. `unknown` na entrada do classificador, refinado por `instanceof`. `exactOptionalPropertyTypes`: tipar `action?: ReactNode` e omitir a chave quando ausente.
- **Botões**: `type="button"` por default (o `Button` do projeto já faz isso).
- **Handlers com Promise**: `router.invalidate()` retorna Promise → envolver em `() => { void router.invalidate(); }` por `no-misused-promises`.
- **Mocks globais**: `vi.spyOn(...)` + `vi.restoreAllMocks()` em `afterEach`. Nunca `Object.defineProperty` direto.
- **CSS**: tokens (`var(--*)`); o `.container` do `EmptyState` já tem `gap: var(--space-3)`, então o slot de ação espaça sozinho.
- **commitlint**: subject não começa com PascalCase. Usar `feat`, `fix`, `test`, `refactor`, `chore`.

---

### Task 1: `EmptyState` ganha slot de ação

**Files:**

- Create: `src/ui/AppShell/EmptyState.test.tsx`
- Modify: `src/ui/AppShell/EmptyState.tsx`

- [ ] **Step 1: Escrever os testes (incluindo o caso novo, que vai falhar)**

Em `src/ui/AppShell/EmptyState.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renderiza título e descrição", () => {
    render(<EmptyState title="Vazio" description="Nada aqui" />);
    expect(screen.getByRole("heading", { name: "Vazio" })).toBeInTheDocument();
    expect(screen.getByText("Nada aqui")).toBeInTheDocument();
  });

  it("renderiza a ação quando passada", () => {
    render(
      <EmptyState
        title="Vazio"
        description="Nada aqui"
        action={<button type="button">Agir</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Agir" })).toBeInTheDocument();
  });

  it("não renderiza botão quando a ação está ausente", () => {
    render(<EmptyState title="Vazio" description="Nada aqui" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar — o caso "renderiza a ação" deve falhar**

Run: `npx vitest run src/ui/AppShell/EmptyState.test.tsx`
Expected: FAIL — `action` não existe na prop (erro de tipo / botão não encontrado).

- [ ] **Step 3: Adicionar o slot `action`**

Substituir todo o conteúdo de `src/ui/AppShell/EmptyState.tsx` por:

```tsx
import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      {action}
    </div>
  );
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `npx vitest run src/ui/AppShell/EmptyState.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/ui/AppShell/EmptyState.tsx src/ui/AppShell/EmptyState.test.tsx
git commit -m "feat(ui): EmptyState aceita slot de ação opcional"
```

---

### Task 2: classificador `classifyRouteError`

**Files:**

- Create: `src/lib/routeError.ts`
- Create: `src/lib/routeError.test.ts`

- [ ] **Step 1: Escrever o teste falho**

Em `src/lib/routeError.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { classifyRouteError } from "./routeError";

describe("classifyRouteError", () => {
  it("TypeError de fetch → connection", () => {
    expect(classifyRouteError(new TypeError("Failed to fetch"))).toBe("connection");
  });

  it("Error embrulhado pela queryFn (com cause) → connection", () => {
    const err = new Error("GET /condos/me failed", { cause: { status: 500 } });
    expect(classifyRouteError(err)).toBe("connection");
  });

  it("outro verbo HTTP embrulhado → connection", () => {
    expect(classifyRouteError(new Error("POST /tickets failed", { cause: {} }))).toBe("connection");
  });

  it("Error de render genérico → unknown", () => {
    expect(classifyRouteError(new Error("Cannot read properties of undefined"))).toBe("unknown");
  });

  it("mensagem de API mas sem cause → unknown", () => {
    expect(classifyRouteError(new Error("GET /x failed"))).toBe("unknown");
  });

  it("valores não-Error → unknown", () => {
    expect(classifyRouteError(undefined)).toBe("unknown");
    expect(classifyRouteError("erro string")).toBe("unknown");
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npx vitest run src/lib/routeError.test.ts`
Expected: FAIL com `Cannot find module './routeError'`.

- [ ] **Step 3: Implementar o classificador**

Em `src/lib/routeError.ts`:

```ts
export type RouteErrorKind = "connection" | "unknown";

// Mensagens embrulhadas pelas queryFn seguem "VERBO /path failed".
const API_ERROR_MESSAGE = /^(GET|POST|PUT|PATCH|DELETE) \/\S* failed$/;

export function classifyRouteError(error: unknown): RouteErrorKind {
  // Falha de fetch (offline, DNS, servidor inacessível) lança TypeError.
  if (error instanceof TypeError) return "connection";
  // Erro HTTP embrulhado pela queryFn carrega `cause` e a mensagem padrão.
  if (
    error instanceof Error &&
    error.cause !== undefined &&
    API_ERROR_MESSAGE.test(error.message)
  ) {
    return "connection";
  }
  return "unknown";
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `npx vitest run src/lib/routeError.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/routeError.ts src/lib/routeError.test.ts
git commit -m "feat(lib): classifyRouteError distingue erro de conexão de desconhecido"
```

---

### Task 3: componente `RouteError` (unitário)

**Files:**

- Create: `src/ui/AppShell/RouteError.tsx`
- Create: `src/ui/AppShell/RouteError.test.tsx`

- [ ] **Step 1: Escrever o teste falho**

Em `src/ui/AppShell/RouteError.test.tsx`. O `useRouter` é mockado para isolar o componente (não há `RouterProvider` aqui):

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockInvalidate } = vi.hoisted(() => ({ mockInvalidate: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ invalidate: mockInvalidate }),
}));

import { RouteError } from "./RouteError";

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("RouteError", () => {
  it("erro de conexão: copy de conexão e retry chama invalidate", async () => {
    render(<RouteError error={new TypeError("Failed to fetch")} reset={() => {}} />);
    expect(screen.getByRole("heading", { name: "Erro de conexão" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
  });

  it("erro desconhecido: copy genérica, loga e oferece recarregar", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const reloadSpy = vi.spyOn(window.location, "reload").mockImplementation(() => {});
    render(<RouteError error={new Error("boom")} reset={() => {}} />);
    expect(screen.getByRole("heading", { name: "Algo deu errado" })).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Recarregar" }));
    expect(reloadSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npx vitest run src/ui/AppShell/RouteError.test.tsx`
Expected: FAIL com `Cannot find module './RouteError'`.

- [ ] **Step 3: Implementar `RouteError`**

Em `src/ui/AppShell/RouteError.tsx`:

```tsx
import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import { Button } from "@/ui/Button/Button";
import { classifyRouteError } from "@/lib/routeError";

export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter();
  const kind = classifyRouteError(error);

  useEffect(() => {
    if (kind === "unknown") {
      console.error(error);
    }
  }, [kind, error]);

  if (kind === "connection") {
    return (
      <EmptyState
        title="Erro de conexão"
        description="Não foi possível carregar os dados. Verifique sua internet e tente novamente."
        action={
          <Button
            onClick={() => {
              void router.invalidate();
            }}
          >
            Tentar novamente
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      title="Algo deu errado"
      description="Ocorreu um erro inesperado. Recarregue a página."
      action={
        <Button
          onClick={() => {
            window.location.reload();
          }}
        >
          Recarregar
        </Button>
      }
    />
  );
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `npx vitest run src/ui/AppShell/RouteError.test.tsx`
Expected: PASS (2 testes).

> Se `vi.spyOn(window.location, "reload")` lançar em jsdom, substituir por
> `vi.spyOn(window.location, "reload").mockImplementation(() => undefined)` —
> a impl vazia evita a navegação real. Não usar `Object.defineProperty`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/AppShell/RouteError.tsx src/ui/AppShell/RouteError.test.tsx
git commit -m "feat(ui): RouteError renderiza tela de erro recuperável por tipo"
```

---

### Task 4: integração `RouteError` com o router real

Verifica que o `defaultErrorComponent` captura um throw de `beforeLoad` e que o retry (`router.invalidate()`) re-executa a navegação. Usa um router sintético mínimo — sem `routeTree.gen` nem `@/api/client` — para não depender de env/auth.

**Files:**

- Create: `src/ui/AppShell/RouteError.integration.test.tsx`

- [ ] **Step 1: Escrever o teste**

Em `src/ui/AppShell/RouteError.integration.test.tsx` (sem mock de `@tanstack/react-router` — usa o router de verdade):

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { RouteError } from "./RouteError";

describe("RouteError integração com o router", () => {
  it("captura throw no beforeLoad e o retry re-executa a navegação", async () => {
    let attempts = 0;
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      beforeLoad: () => {
        attempts += 1;
        if (attempts === 1) {
          throw new TypeError("Failed to fetch");
        }
      },
      component: () => <div>Conteúdo carregado</div>,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
      defaultErrorComponent: RouteError,
    });

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Erro de conexão" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Conteúdo carregado")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar — deve passar**

Run: `npx vitest run src/ui/AppShell/RouteError.integration.test.tsx`
Expected: PASS (1 teste). Primeira carga mostra "Erro de conexão"; após o retry, "Conteúdo carregado".

> Notas de tipo (não suprimir com `any`):
>
> - O `createRouter` sintético **não** exige `context`: o `rootRoute` aqui é
>   `createRootRoute()` sem context, então omitir a prop é válido.
> - Dentro de `RouteError`, `useRouter()` é tipado pelo `Register` global (de
>   `src/app/router.tsx`), mas em runtime retorna este router sintético —
>   `invalidate` existe em qualquer router, então a chamada funciona sem cast.

- [ ] **Step 3: Commit**

```bash
git add src/ui/AppShell/RouteError.integration.test.tsx
git commit -m "test(ui): RouteError captura beforeLoad e retry re-executa"
```

---

### Task 5: registrar `defaultErrorComponent` no router + verificação final

**Files:**

- Modify: `src/app/router.tsx`

- [ ] **Step 1: Registrar o componente**

Substituir o conteúdo de `src/app/router.tsx` por (acrescenta o import e a prop):

```ts
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { queryClient } from "./queryClient";
import { RouteError } from "@/ui/AppShell/RouteError";

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  context: { queryClient },
  defaultErrorComponent: RouteError,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: passa (sem erros).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: passa. Conferir especialmente `no-misused-promises` no `void router.invalidate()`.

- [ ] **Step 4: Suite completa + build**

Run: `npm run test && npm run build`
Expected: todos os testes passam (incluindo os 4 arquivos novos) e o build gera `dist/` sem erro.

- [ ] **Step 5: Commit**

```bash
git add src/app/router.tsx
git commit -m "feat(router): registra RouteError como defaultErrorComponent"
```

---

## Verificação manual (smoke, opcional)

- [ ] `npm run dev`, derrubar o Core local (ou usar DevTools → offline) e navegar para uma rota guardada (`/c/$id/inbox`). Esperado: tela "Erro de conexão" com "Tentar novamente"; religar o Core e clicar no botão → a rota carrega.

---

## Resumo dos commits

1. `feat(ui): EmptyState aceita slot de ação opcional`
2. `feat(lib): classifyRouteError distingue erro de conexão de desconhecido`
3. `feat(ui): RouteError renderiza tela de erro recuperável por tipo`
4. `test(ui): RouteError captura beforeLoad e retry re-executa`
5. `feat(router): registra RouteError como defaultErrorComponent`
