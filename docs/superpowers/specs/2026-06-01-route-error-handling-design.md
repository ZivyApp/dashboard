# Tratamento de erro no carregamento de rotas — Design

**Data:** 2026-06-01
**Origem:** follow-up registrado no PR #17 (`project_routeguards_error_ux`) — `ensureQueryData` em `requireRole`/`requireRoleAny` propaga falha de rede sem distinção e sem UI recuperável.

## Problema

Os guards de rota (`src/lib/routeGuards.ts`) chamam `context.queryClient.ensureQueryData(myCondosQueryOptions())` no `beforeLoad`. Há dois desfechos hoje:

- **RBAC negado** — o fetch dá certo mas o papel é insuficiente → `throw redirect()` (vai pro inbox / `no-access`). **Já tratado.**
- **Falha de rede/servidor** — `ensureQueryData` rejeita e o erro propaga cru. Como o router **não tem nenhum `errorComponent`/`defaultErrorComponent`**, cai no fallback default do TanStack Router (tela de erro pelada, sem retry, sem mensagem útil).

O gap real, portanto, **não** é diferenciar RBAC de rede (RBAC já é redirect) — é dar uma **UI recuperável** para a falha de carga, distinguindo "problema de conexão" (acionável: tentar de novo) de um bug genuíno de código.

## Objetivo

Registrar um `defaultErrorComponent` global que capture throws de `beforeLoad`/`loader`/render sem boundary próprio e apresente:

- **Erro de conexão** (rede/servidor) → mensagem clara + botão **Tentar novamente** que re-executa a navegação.
- **Erro desconhecido** (bug) → mensagem genérica + botão **Recarregar**, com `console.error` para não engolir o bug.

Escopo deliberadamente mínimo (opção "A" do brainstorming): só recuperação de carga. **Não** inclui reclassificar `401`/sessão expirada para redirect ao login (ver Limitações).

## Arquitetura

Três unidades isoladas, cada uma com responsabilidade única.

### 1. Classificador puro — `src/lib/routeError.ts`

Função pura, sem import de `@/lib/env` (testável em CI sem `.env.local`):

```ts
export type RouteErrorKind = "connection" | "unknown";

export function classifyRouteError(error: unknown): RouteErrorKind;
```

Regra de classificação:

- **`connection`** quando o erro nasceu da camada de dados:
  - `error instanceof TypeError` — falha de fetch (offline, DNS, CORS, servidor inacessível). É o que `fetch`/`openapi-fetch` lança quando a requisição não completa.
  - `error instanceof Error` com `cause` definido **e** `message` iniciando com um verbo HTTP conhecido seguido de path (`GET /…`, `POST /…`, etc.) — é o erro embrulhado pela queryFn (`throw new Error("GET /condos/me failed", { cause })`). Detectar via prefixo de `message` + presença de `cause`, não por igualdade exata (outras queries seguem o mesmo padrão).
- **`unknown`** para todo o resto (erros de render/runtime que não vieram da camada de dados).

> A heurística é conservadora: prefere classificar como `connection` (acionável com retry) quando o erro claramente veio de I/O. Bugs de render não têm `cause` nem `TypeError` de fetch, então caem em `unknown`.

### 2. Tela de erro — `src/ui/AppShell/RouteError.tsx`

Componente que o router injeta como `defaultErrorComponent`. Assinatura compatível com `ErrorComponentProps` do TanStack Router (`{ error, reset, info }`).

- Chama `classifyRouteError(error)`.
- Usa `useRouter()` para obter o router e disparar o retry.
- Renderiza via `EmptyState` (ver unidade 3) + `Button` (`src/ui/Button`).

Comportamento por tipo:

| Tipo         | Título            | Descrição                                                                       | Botão              | Ação                       |
| ------------ | ----------------- | ------------------------------------------------------------------------------- | ------------------ | -------------------------- |
| `connection` | "Erro de conexão" | "Não foi possível carregar os dados. Verifique sua internet e tente novamente." | "Tentar novamente" | `void router.invalidate()` |
| `unknown`    | "Algo deu errado" | "Ocorreu um erro inesperado. Recarregue a página."                              | "Recarregar"       | `window.location.reload()` |

Para `unknown`, chamar `console.error(error)` (em todo ambiente) para que o bug apareça no console em vez de ser silenciado.

> Textos finais aprovados no brainstorming; ajustáveis sem mudar a arquitetura.

### 3. Slot de ação no `EmptyState` — `src/ui/AppShell/EmptyState.tsx`

Hoje `EmptyState` aceita só `title` + `description`. Estender com slot opcional:

```ts
interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode; // renderizado abaixo da descrição quando presente
}
```

Mudança retrocompatível — os usos atuais (`no-access`, `settings`, `structure/*`) continuam funcionando sem alteração. Mantém consistência visual e evita um componente de erro do zero. Respeitar `exactOptionalPropertyTypes` (omitir a chave quando ausente; tipar `action?: ReactNode`, não `ReactNode | undefined`).

### 4. Registro global — `src/app/router.tsx`

```ts
createRouter({
  // …config existente…
  defaultErrorComponent: RouteError,
});
```

Captura qualquer throw de `beforeLoad`/`loader`/render que não tenha `errorComponent` próprio. Nenhuma rota declara boundary hoje, então isso passa a cobrir todas.

## Retry

O botão de `connection` chama `router.invalidate()`:

1. `invalidate()` re-executa os `beforeLoad`/`loader` das rotas correntes.
2. O `beforeLoad` do guard chama `ensureQueryData(myCondosQueryOptions())` de novo.
3. `ensureQueryData` refaz queries que estão em estado de erro (não há `data` em cache de uma query que rejeitou), disparando novo fetch.
4. Sucesso → a rota renderiza normalmente; falha persistente → volta para `RouteError`.

Esse comportamento (refetch de query errada via `invalidate`) é **confirmado por teste** (ver abaixo), não assumido.

## Limitações conhecidas (intencionais)

- **`401`/sessão expirada no meio da navegação** cai em `connection` e oferece "Tentar novamente" em vez de redirecionar para `/login`. Era a opção "B" do brainstorming, adiada. Follow-up: reclassificar erro com status `401` da `cause` para `throw redirect({ to: "/login" })`.
- **Sem boundary granular por rota** — tratamento é global. Suficiente para o gap atual; rotas futuras com necessidade específica podem declarar `errorComponent` próprio (sobrescreve o default).

## Testes

- **`routeError.test.ts`** (unitário do classificador):
  - `TypeError("Failed to fetch")` → `"connection"`.
  - `new Error("GET /condos/me failed", { cause: {...} })` → `"connection"`.
  - `new Error("Cannot read properties of undefined")` (sem `cause`) → `"unknown"`.
  - valores não-`Error` (`undefined`, string) → `"unknown"`.
- **`RouteError.test.tsx`** (componente):
  - erro de conexão → renderiza título/descrição de conexão + botão "Tentar novamente"; clique chama `router.invalidate` (router mockado).
  - erro desconhecido → copy genérica + botão "Recarregar".
  - mockar `useRouter` (e `window.location.reload`) via `vi.spyOn`/`vi.mock` conforme o caso.
- **`EmptyState.test.tsx`**: renderiza o `action` quando passado; não renderiza nada extra quando ausente.
- **Integração (guard → boundary)**: rota com `ensureQueryData` rejeitando exibe `RouteError`. Mockar `@/api/client` via `vi.mock` + `vi.hoisted` (convenção do projeto para módulos que importam `@/lib/env` transitivamente).

## Arquivos

**Criar:**

- `src/lib/routeError.ts` — classificador puro.
- `src/lib/routeError.test.ts` — unitário.
- `src/ui/AppShell/RouteError.tsx` — tela de erro.
- `src/ui/AppShell/RouteError.test.tsx` — teste do componente.

**Modificar:**

- `src/app/router.tsx` — registra `defaultErrorComponent`.
- `src/ui/AppShell/EmptyState.tsx` — slot `action?`.
- `src/ui/AppShell/EmptyState.test.tsx` — cobre o slot (criar se não existir).

## Convenções aplicáveis

- Tipagem honesta: `unknown` na entrada do classificador, refinado por `instanceof` antes de usar (sem `any`/cast).
- Botões `type="button"` por default; handlers com Promise envoltos em `() => { void ... }`.
- CSS Modules com tokens; classes via `Record` com fallback `?? ""` quando houver variação.
- Mock de módulos env-bound com `vi.mock` + `vi.hoisted`, não `vi.spyOn`.
- commitlint: subject não começa com PascalCase.
