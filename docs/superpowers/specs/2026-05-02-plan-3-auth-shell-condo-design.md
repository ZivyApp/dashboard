# Spec — Plan 3: Auth, Layout Shell e Condo Switcher

**Data:** 2026-05-02
**Posição no roadmap:** sucessor do Plan 2 (scaffold, mergeado em `78fe26e`); precede Plans 4+ (Inbox, Tickets, Approvals, Settings).
**Objetivo:** transformar o scaffold do Plan 2 num app navegável — usuário consegue logar com email/senha, ver o shell (header + sidebar + content), trocar entre condos via URL, e ter rotas barradas conforme o role retornado pelo Core. Sem features de produto: Inbox, Tickets, Aprovações e Settings entram como placeholders.

---

## Contexto

O Plan 2 entregou fundações (design tokens, providers, API client, Supabase singleton, PWA, CI). Não há ainda nenhuma tela: a rota raiz mostra placeholder, não há login, não há shell, não há roteamento por condo. Para qualquer feature de produto avançar (Plan 4 em diante), três blocos precisam existir: autenticação real, layout aplicacional, e o conceito de "condo ativo" derivado do path.

O Core Go já expõe os endpoints necessários:

- **`GET /condos/me`** (auth-only, sem `X-Condo-ID`) → `[{condo_id, condo_name, condo_slug, role}]`. Um usuário pode estar vinculado a múltiplos condos com roles diferentes.
- Validação de JWT do Supabase via JWKS EC P-256 (com fallback HS256).
- Middleware `Authenticate` exige `X-Condo-ID` em todas as rotas tenant-scoped (não-super); `AuthenticateNoCondoRequired` apenas para `/condos/me`.
- Hierarquia de roles `viewer < staff < manager < super_admin` (`core/internal/domain/auth.go`).
- Role efetivo no front é **por condo** (não por usuário) — vem da resposta de `/condos/me`, não de claims do JWT.

O scaffold já tem helpers preparados:

- `src/api/auth.ts` — `applyAuthHeaders(request, getters)` injeta `Authorization` e `X-Condo-ID`.
- `src/api/client.ts` — `configureApiAuth(opts)` registra os getters.
- `src/lib/supabase.ts` — singleton com `persistSession`, `autoRefreshToken`.

---

## Decisões fixadas no brainstorm (2026-05-02)

- **Login:** email + senha via Supabase. Sem OAuth, sem magic link, sem recuperação.
- **Condo ativo:** vive na URL (`/c/$condoId/...`). API client lê de variável de módulo separada, sincronizada no `beforeLoad` do layout. Não lê do router (evita ler estado em transição).
- **Roles:** lista vem de `/condos/me` por condo. Hierarquia em módulo puro espelhando o Core.
- **Menu:** placeholders desde já para Inbox, Tickets, Aprovações, Settings — telas mostram "Em breve".
- **Recorte:** **6 PRs** em 3 marcos (3.1a, 3.1b, 3.2a, 3.2b, 3.3a, 3.3b). PRs pequenos, TDD-first.
- **Telegram do gestor:** fora de escopo (registrado em `docs/backlog.md` para Plan de Notificações).
- **Toast system:** fora de escopo.

---

## Arquitetura

### Visão geral do fluxo

```
1. main.tsx
   ├── initTheme()                        (síncrono, antes do createRoot)
   ├── initSession()                      (síncrono: getSession → registra listener)
   ├── createRouter(...)                  (TanStack Router)
   ├── configureApiAuth({ getters })      (depois do router; closure lê condo de active-condo.ts)
   └── createRoot(...).render(<Providers><RouterProvider /></Providers>)

2. Login (rota /login)
   useSignIn().signIn(email, password)
     → supabase.auth.signInWithPassword(...)
     → onAuthStateChange dispara ("SIGNED_IN")
     → session store atualiza
     → redirect ?redirect ou para /

3. Rota /
   _app/index.tsx beforeLoad:
     await ensureQueryData(myCondosQueryOptions)
     → 0 condos: redirect /no-access
     → 1+ condos: redirect /c/<lastSelected ou primeiro>/inbox

4. Rota /c/$condoId/_layout
   beforeLoad:
     await ensureQueryData(myCondosQueryOptions)
     → valida que condoId está na lista
       → ausente e há outros: redirect para primeiro
       → ausente e lista vazia: redirect /no-access
     → setActiveCondoId(condoId)         (alimenta API client)
     → setLastSelected(condoId)          (localStorage)

5. Qualquer chamada de API
   applyAuthHeaders middleware:
     → Authorization: Bearer <getAccessToken()>
     → X-Condo-ID: <getActiveCondoId()>  (undefined em /condos/me)
```

### Fonte de verdade

| Conceito                 | Fonte primária                               | Espelho                                   |
| ------------------------ | -------------------------------------------- | ----------------------------------------- |
| Sessão Supabase          | SDK do Supabase (`localStorage` interno)     | `useSessionStore` (Zustand, reativo)      |
| `accessToken`            | `useSessionStore.session.access_token`       | nenhum                                    |
| Lista de condos do user  | TanStack Query (`["condos","me"]`)           | nenhum                                    |
| Condo ativo (UI)         | path param `/c/$condoId/...`                 | nenhum                                    |
| Condo ativo (API client) | variável de módulo `src/api/active-condo.ts` | sincronizado no `beforeLoad` do `_layout` |
| Último condo selecionado | `localStorage` (`zivy:lastCondoId`)          | nenhum                                    |
| Tema                     | `useThemeStore` + `data-theme` no `<html>`   | nenhum (já no Plan 2)                     |

Princípio: cada conceito tem **uma** fonte primária. Espelhos só existem quando a fonte primária não é facilmente lida do contexto onde precisamos (ex.: API middleware roda fora de componente React, então precisa de variável de módulo).

### Stack

Sem novas dependências. Usa apenas o que o Plan 2 já trouxe (Vite 5, React 19, TanStack Router/Query, Zustand, Supabase JS, openapi-fetch, Vitest, Radix `DropdownMenu` e `Dialog`, CSS Modules + tokens).

---

## Decomposição em PRs

### Marco 3.1 — Auth fundamentals

**PR 3.1a — Sessão e bridge** (não-visível ao usuário)

- `src/stores/session.ts` — Zustand store `{ session, status }`, `signIn`, `signOut`, `__resetForTests`.
- `src/stores/session.ts` — `initSession()` chama `getSession()` síncrono, registra `onAuthStateChange` apenas após `getSession` resolver. Flag `attached` evita duplicação.
- `src/main.tsx` — chamar `initSession()` antes do `createRoot`. `configureApiAuth({ getAccessToken: () => getAccessToken(), getActiveCondoId })` após `createRouter`.
- `src/api/active-condo.ts` — `setActiveCondoId(id)`, `getActiveCondoId()`, variável de módulo. `__resetForTests`.
- `src/ui/Spinner/` — Spinner usado no splash da próxima fatia.
- Testes: `session.test.ts` (signIn sucesso/falha, signOut, listener idempotente, race do init), `active-condo.test.ts`.

**PR 3.1b — UI de login + guard**

- `src/features/auth/useSignIn.ts` — wrapper sobre `signIn` com mapeamento de erros pt-BR.
- `src/features/auth/LoginForm.tsx` + `.module.css` — form HTML5 nativo, `aria-invalid`, mensagens acessíveis.
- `src/app/routes/login.tsx` — rota pública, `beforeLoad` redireciona se já autenticado.
- `src/lib/routeGuards.ts` — `requireAuth({ location })` lança `redirect({ to: "/login", search: { redirect: location.href } })` quando `status === "anonymous"`.
- `src/app/routes/__root.tsx` — splash de Spinner enquanto `status === "loading"`.
- `src/app/routes/index.tsx` — placeholder mínimo "Logado como X" + botão Sair (placeholder; será reescrito na fatia 3.2).
- Testes: `useSignIn.test.ts` (4 mapeamentos de erro), `LoginForm.test.tsx`, `routeGuards.test.ts` (matriz de status).

### Marco 3.2 — Layout shell

**PR 3.2a — Shell base + theme + user menu**

- `src/ui/AppShell/AppShell.tsx` + `.module.css` — grid responsivo (header + main; sidebar entra na 3.2b).
- `src/ui/AppShell/Header.tsx` — logo, slot vazio do switcher (comentado), `ThemeToggle`, `UserMenu`.
- `src/ui/AppShell/ThemeToggle.tsx` — botão que cicla light/dark/system, `aria-label` reflete estado.
- `src/ui/AppShell/UserMenu.tsx` — Radix `DropdownMenu`, item "Sair" chama `signOut`.
- `src/app/routes/_app.tsx` — layout route com `beforeLoad: requireAuth`, renderiza `<AppShell><Outlet /></AppShell>`.
- `src/app/routes/index.tsx` — agora redireciona para `/_app/`.
- Stories: `AppShell.stories.tsx` (desktop + mobile via decorator de viewport).
- Testes: AppShell renderiza, ThemeToggle alterna `data-theme`, UserMenu logout chama store.

**PR 3.2b — Sidebar + placeholders + drawer mobile**

- `src/ui/AppShell/Sidebar.tsx` — lista de itens com `Link`. Em mobile: dentro de Radix `Dialog`, fecha ao clicar.
- `src/ui/AppShell/AppShell.module.css` — atualizar grid para incluir sidebar desktop.
- `src/app/routes/_app/inbox.tsx`, `tickets.tsx`, `approvals.tsx`, `settings.tsx` — placeholders com `EmptyState` ("Em breve").
- `src/app/routes/_app/index.tsx` — redireciona para `/inbox` (será reescrito na 3.3b).
- Testes: Sidebar links, drawer mobile abre/fecha, items navegam.

### Marco 3.3 — Condo switcher e role guards

**PR 3.3a — Camada de dados (não-visível)**

- `src/lib/safeStorage.ts` — extrair de `stores/theme.ts` para módulo compartilhado. Atualizar `theme.ts` para importar.
- `src/features/condo/roleHierarchy.ts` — `Role` type, `isAtLeast(actual, required)`. Puro.
- `src/features/condo/useMyCondos.ts` — `useQuery(["condos","me"], ...)` chamando `api.GET("/condos/me")`. Exporta `myCondosQueryOptions()` para uso em `ensureQueryData`. `staleTime: 5 * 60_000`. `retry: 1`.
- `src/stores/activeCondo.ts` — wrapper sobre `safeStorage` para `lastSelectedCondoId`. Funções puras `getLastSelected()`, `setLastSelected(id)`, `clearLastSelected()`.
- Testes: `safeStorage` (já no Plan 2 indiretamente), `roleHierarchy` (matriz 4×4 de `isAtLeast`), `useMyCondos` (loading/success/error com mock do `api`), `activeCondo` (get/set/clear; `setItem` falha é silencioso).

**PR 3.3b — Roteamento, switcher, guards (visível)**

- Mover placeholders: `src/app/routes/_app/{inbox,tickets,approvals,settings}.tsx` → `src/app/routes/_app/c/$condoId/<mesmo>.tsx`.
- `src/app/routes/_app/c/$condoId/_layout.tsx` — `beforeLoad`:
  1. `await context.queryClient.ensureQueryData(myCondosQueryOptions())`.
  2. Validar `params.condoId`:
     - Não está na lista E lista não-vazia → `redirect({ to: "/c/$condoId/inbox", params: { condoId: condos[0].condoId } })`.
     - Não está na lista E lista vazia → `redirect({ to: "/no-access" })`.
  3. `setActiveCondoId(params.condoId)`.
  4. `setLastSelected(params.condoId)`.
- `src/app/routes/_app/index.tsx` — reescrever `beforeLoad`:
  1. `condos = await ensureQueryData(myCondosQueryOptions())`.
  2. Se vazia → `redirect({ to: "/no-access" })`.
  3. `target = condos.find(c => c.condoId === getLastSelected()) ?? condos[0]`.
  4. `redirect({ to: "/c/$condoId/inbox", params: { condoId: target.condoId } })`.
- `src/app/routes/no-access.tsx` — `beforeLoad: requireAuth`. Mensagem + botão Sair.
- `src/features/condo/CondoSwitcher.tsx` — Radix `DropdownMenu` listando condos do `useMyCondos`. Item ativo destacado. Ao selecionar, `navigate({ to: "/c/$condoId/<subPath>", params: { condoId: newId } })` preservando subpath atual via `useMatches`.
- `src/ui/AppShell/Header.tsx` — substituir slot vazio pelo `<CondoSwitcher>`.
- `src/lib/routeGuards.ts` — adicionar `requireRole(min)` que retorna função compatível com `beforeLoad`. Lê `condos` do query cache, encontra o condo do path, valida role.
- `src/features/condo/useRoleGuard.ts` — hook que retorna `{ allowed: boolean }` para uso em UI (ex.: esconder item de menu).
- `src/ui/AppShell/Sidebar.tsx` — item "Aprovações" usa `useRoleGuard("manager")` para visibilidade.
- `src/app/routes/_app/c/$condoId/approvals.tsx` — `beforeLoad: requireRole("manager")`.
- `src/stores/session.ts` — atualizar `signOut` para chamar `setActiveCondoId(undefined)` e `clearLastSelected()`.
- Testes: `_app/index.tsx` (3 cenários: 0/1/N condos), `_layout.tsx` (3 cenários: válido/inválido/lista vazia), `CondoSwitcher.test.tsx` (troca preserva subpath), `useRoleGuard.test.ts` (matriz), `requireRole.test.ts` (passa/redireciona).

---

## Componentes — mapa de unidades

```
src/
├── api/
│   ├── active-condo.ts            (NEW, 3.1a)
│   ├── auth.ts                    (sem mudança)
│   └── client.ts                  (sem mudança no contrato; reuso pelos hooks)
├── stores/
│   ├── session.ts                 (NEW, 3.1a; atualizado em 3.3b)
│   ├── activeCondo.ts             (NEW, 3.3a)
│   └── theme.ts                   (MODIFY, 3.3a — importa safeStorage extraído)
├── lib/
│   ├── safeStorage.ts             (NEW, 3.3a)
│   └── routeGuards.ts             (NEW, 3.1b; atualizado em 3.3b)
├── features/
│   ├── auth/
│   │   ├── useSignIn.ts           (NEW, 3.1b)
│   │   ├── LoginForm.tsx          (NEW, 3.1b)
│   │   └── LoginForm.module.css   (NEW, 3.1b)
│   └── condo/
│       ├── roleHierarchy.ts       (NEW, 3.3a)
│       ├── useMyCondos.ts         (NEW, 3.3a)
│       ├── useRoleGuard.ts        (NEW, 3.3b)
│       ├── CondoSwitcher.tsx      (NEW, 3.3b)
│       └── CondoSwitcher.module.css (NEW, 3.3b)
├── ui/
│   ├── AppShell/
│   │   ├── AppShell.tsx           (NEW, 3.2a; atualizado em 3.2b)
│   │   ├── AppShell.module.css    (NEW, 3.2a; atualizado em 3.2b)
│   │   ├── Header.tsx             (NEW, 3.2a; atualizado em 3.3b)
│   │   ├── Sidebar.tsx            (NEW, 3.2b; atualizado em 3.3b)
│   │   ├── UserMenu.tsx           (NEW, 3.2a)
│   │   ├── ThemeToggle.tsx        (NEW, 3.2a)
│   │   └── EmptyState.tsx         (NEW, 3.2b)
│   └── Spinner/
│       ├── Spinner.tsx            (NEW, 3.1a)
│       └── Spinner.module.css     (NEW, 3.1a)
├── app/routes/
│   ├── __root.tsx                 (MODIFY, 3.1b)
│   ├── login.tsx                  (NEW, 3.1b)
│   ├── no-access.tsx              (NEW, 3.3b)
│   ├── index.tsx                  (MODIFY 3.1b, 3.2a)
│   ├── _app.tsx                   (NEW, 3.2a)
│   └── _app/
│       ├── index.tsx              (NEW, 3.2b; reescrito em 3.3b)
│       └── c/$condoId/
│           ├── _layout.tsx        (NEW, 3.3b)
│           ├── inbox.tsx          (MOVED, 3.3b)
│           ├── tickets.tsx        (MOVED, 3.3b)
│           ├── approvals.tsx      (MOVED + requireRole, 3.3b)
│           └── settings.tsx       (MOVED, 3.3b)
├── test/
│   ├── mockSupabase.ts            (NEW, 3.1a)
│   ├── fixtures.ts                (NEW, 3.1a; expandido em 3.3a)
│   ├── renderWithQuery.tsx        (NEW, 3.3a)
│   └── expectRedirect.ts          (NEW, 3.1b)
└── main.tsx                       (MODIFY, 3.1a)
```

---

## Error handling — comportamento por cenário

| Cenário                                       | Comportamento                                                                                                                                                                                                           |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Usuário sem nenhum condo                      | `_app/index` ou `_layout` redireciona para `/no-access`. Mensagem orienta contato com suporte.                                                                                                                          |
| `/condos/me` falha (rede/5xx)                 | TanStack Query retry 1x. Se falhar, tela de erro com `role="alert"` e botão "Tentar de novo" que invalida o query.                                                                                                      |
| Sessão expira durante uso                     | Supabase SDK dispara `SIGNED_OUT` no listener → store limpa, `setActiveCondoId(undefined)` é chamado, `clearLastSelected()` é chamado. Próxima navegação aciona `requireAuth` e redireciona para `/login?redirect=...`. |
| Chamada API retorna 401                       | Não interceptar. Componente que chamou trata erro localmente. Próxima navegação cai no guard.                                                                                                                           |
| `condoId` do path foi removido da lista       | `_layout` redireciona para primeiro condo válido (ou `/no-access` se lista vazia). Sem toast.                                                                                                                           |
| `condoId` do path é UUID inválido / aleatório | Mesmo tratamento — não está na lista, redireciona. Sem validação de formato no front.                                                                                                                                   |
| Login: credencial inválida                    | Mensagem mapeada: "Email ou senha inválidos".                                                                                                                                                                           |
| Login: email não confirmado                   | Mensagem mapeada: "Confirme seu email antes de entrar".                                                                                                                                                                 |
| Login: rate limit                             | Mensagem mapeada: "Muitas tentativas. Aguarde alguns minutos."                                                                                                                                                          |
| Login: erro de rede                           | Mensagem genérica fallback: "Não foi possível entrar. Tente novamente."                                                                                                                                                 |
| Multi-aba (logout em outra aba)               | Confiar no `BroadcastChannel` do Supabase. Próxima navegação na aba afetada cai no guard.                                                                                                                               |

---

## Estratégia de testes

### Princípios

- TDD-first: cada unidade entra com teste que falha antes da implementação.
- Cobertura por **comportamento** observável, não por % de linha.
- Stores expõem `__resetForTests()` (no-op em produção). Resetar no `beforeEach`.
- Tests não dependem de ordem de execução.

### Mocks

- **Supabase JS:** `vi.mock("@/lib/supabase", ...)` por arquivo de teste, alimentado por factory `src/test/mockSupabase.ts`.
- **API client:** `vi.mock("@/api/client", ...)` configurando `api.GET`/`api.POST` por teste. Sem MSW.

### Helpers compartilhados (`src/test/`)

- `mockSupabase.ts` — `createSupabaseMock()` retorna objeto com `auth.{signInWithPassword, signOut, getSession, onAuthStateChange}` como `vi.fn()`.
- `fixtures.ts` — factories `mockSession(overrides)`, `mockCondo(overrides)`, `mockUser(overrides)`. Tipos vêm de `@supabase/supabase-js` e do contrato local.
- `renderWithQuery.tsx` — `renderWithQuery(ui)` e `renderHookWithQuery(hook)` envolvem com `QueryClientProvider` novo (`retry: false, gcTime: 0`).
- `expectRedirect.ts` — `expectRedirect(fn, expectedTo)` captura `throw redirect(...)` e valida `error.options.to` (e opcionalmente `params`/`search`).

### Cobertura mínima por PR

| PR   | Testes                                                                                                                                                                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1a | `session` store (4 cenários: signIn ok/falha, signOut, listener idempotente), `initSession` (race startup: getSession resolve antes do listener registrar), `active-condo` (get/set/reset)                                                                                                  |
| 3.1b | `useSignIn` (4 mapeamentos de erro + sucesso), `LoginForm` (validação HTML, submit, erro acessível), `requireAuth` (3 estados de status), `/login` redireciona se autenticado, splash do `__root`                                                                                           |
| 3.2a | `AppShell` renderiza, `ThemeToggle` cicla 3 estados e atualiza `data-theme`, `UserMenu` logout chama `signOut`, `_app` aplica `requireAuth`                                                                                                                                                 |
| 3.2b | `Sidebar` itens navegam, drawer mobile abre/fecha, `EmptyState` renderiza title+description                                                                                                                                                                                                 |
| 3.3a | `roleHierarchy.isAtLeast` (matriz 4×4), `useMyCondos` (loading/success/error com mock do api), `activeCondo.lastSelected` (get/set/clear; falha de setItem é silenciosa), `safeStorage` (cobertura herdada de theme; novo teste para falha de setItem)                                      |
| 3.3b | `_app/index` `beforeLoad` (3 cenários: 0/1/N condos), `_layout` `beforeLoad` (3 cenários: válido / não na lista / lista vazia), `CondoSwitcher` (troca preserva subpath atual), `useRoleGuard` (matriz role × min), `requireRole` (passa/redireciona), `Sidebar` esconde item conforme role |

---

## Riscos e mitigações

| Risco                                                             | Mitigação                                                                                                                                                             |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Race no startup: `getSession()` async pinta `/login` por um frame | Splash de Spinner enquanto `status === "loading"`. `initSession` registra listener apenas **após** `getSession` resolver.                                             |
| Circularidade `providers.tsx` ↔ `router.tsx`                      | `configureApiAuth` em `main.tsx` após `createRouter`, com closure que lê de `active-condo.ts`. `client.ts` não importa `router`.                                      |
| Bridge URL→header acessando `router.state` em transição           | Não ler do router. `setActiveCondoId(condoId)` no `beforeLoad` do `_layout`. Variável de módulo. Limpada no `signOut` e em `SIGNED_OUT`.                              |
| `X-Condo-ID` em `/condos/me`                                      | Core usa `AuthenticateNoCondoRequired` que ignora o header — seguro enviar. Quando `activeCondoId === undefined`, o middleware nem envia.                             |
| Refresh token expirado                                            | SDK dispara `SIGNED_OUT`. Listener limpa store + `activeCondoId` + `lastSelected`. Próxima nav redireciona para `/login`.                                             |
| Slice 3.3b grande                                                 | Já fatiada em 3.3a (camada de dados) + 3.3b (visível). Se 3.3b ainda ficar pesada, pode-se separar `requireRole` + `useRoleGuard` em 3.3c — decisão durante execução. |
| Listeners do `onAuthStateChange` acumulando em StrictMode/HMR     | Flag `attached` no módulo. Mesmo padrão do `theme.ts`.                                                                                                                |
| Tests com `vi.mock` vazando entre arquivos                        | `__resetForTests` por store + `vi.restoreAllMocks()` em `afterEach`.                                                                                                  |

---

## Critérios de aceite

### Por PR

Cada PR é considerado pronto quando:

- Todos os testes da fatia passam (`npm run test`).
- `npm run typecheck`, `npm run lint`, `npm run build` verdes.
- CI verde no GitHub Actions.
- Preview Vercel funcional (link no PR).
- Sem console errors no preview em uso normal.

### Por marco

- **3.1 (após 3.1b):** login com credenciais válidas redireciona para `/`. Refresh em rota privada com sessão ativa não pisca login. Acesso a rota privada sem auth redireciona para `/login?redirect=...`. Logout volta para `/login`.
- **3.2 (após 3.2b):** após login, usuário cai em `/inbox` dentro do AppShell. Sidebar navega entre 4 placeholders. ThemeToggle no header funciona. Mobile: drawer abre/fecha.
- **3.3 (após 3.3b):** após login, redirect respeita "último condo". URL é `/c/<id>/inbox`. Switcher troca o condo na URL e na próxima chamada de API o `X-Condo-ID` reflete a mudança. Como `viewer`, "Aprovações" some do menu e a rota redireciona. Como `manager`, ambos funcionam.

### Plan completo

- Branch `develop` em estado verde, com 6 PRs mergeados (3.1a → 3.3b).
- Smoke test manual no preview Vercel cobre os critérios por marco acima.
- `CLAUDE.md` atualizado com novos padrões surgidos na execução (lições de code review).
- `develop` pronta para promoção a `main` em janela de release dedicada.

---

## Out of scope

Itens descartados conscientemente. Razões em `docs/backlog.md` ou comentadas abaixo.

- **Vinculação Telegram do gestor** — `docs/backlog.md` §"Vinculação de Telegram do gestor".
- **Magic link, OAuth, recovery** — Plan de Auth Avançada futuro.
- **Telas reais** de Inbox / Tickets / Approvals / Settings — Plans 4+.
- **Toast system** — não há cenário no Plan 3 que justifique. Caso A4 (condo removido) usa redirect silencioso.
- **MSW** — testes unit usam `vi.mock`. MSW só justificável quando começarmos a testar contrato real do Core no front.
- **i18n** — strings em pt-BR hardcoded. Internacionalização entra quando houver demanda.
- **Persistência de "tema do condo"** — tema é por usuário (já no Plan 2), não por condo.
- **Switcher de condo via comando/atalho** — só dropdown.
- **Avatar com foto** — `UserMenu` mostra inicial do email; foto entra com Settings real.
- **Análise de telemetria** (login success/fail rate, switcher usage) — sem instrumentação no Plan 3.
