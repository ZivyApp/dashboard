# Plan 3 — Auth, Layout Shell e Condo Switcher

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o scaffold do Plan 2 num app navegável: usuário consegue logar, ver o shell (header + sidebar + content), trocar entre condos via URL, e ter rotas barradas conforme o role retornado pelo Core. Ainda sem features de produto (Inbox, Tickets, Aprovações, Settings continuam como placeholders).

**Arquitetura:** SPA TanStack Router file-based, sessão Supabase persistida pelo SDK, `condo_id` derivado do path param `/c/$condoId/...` e injetado nos headers da API via `applyAuthHeaders`. Role do usuário no condo ativo vem de `GET /condos/me` (retorna `[{condo_id, condo_name, condo_slug, role}]`), com cache TanStack Query. Hierarquia de roles `viewer < staff < manager < super_admin` espelhando o Core.

**Tech Stack:** continua a do Plan 2 (Vite 5, React 19, TypeScript strict, TanStack Router/Query, Zustand, Supabase JS, openapi-fetch, Vitest). Sem novas deps.

**Spec de referência:** Plan 2 mergeado (`78fe26e`); domínio de auth do Core em `core/internal/domain/auth.go` e `core/internal/adapters/http/middleware/auth.go`; endpoint do switcher em `core/internal/adapters/http/manager_handler.go` (`ListMyCondos`).

---

## Escopo e premissas

**O que este plano faz:**

1. **Slice 3.1 — Auth fundamentals:** tela de login email/senha, store de sessão Zustand, bridge com `applyAuthHeaders`, guard `requireAuth` no root, `/login` pública.
2. **Slice 3.2 — Layout shell:** AppShell (header + sidebar desktop, drawer mobile), theme toggle no header, user menu com logout, rotas placeholder `/inbox`, `/tickets`, `/approvals`, `/settings`.
3. **Slice 3.3 — Condo switcher + role guards:** rotas privadas reescritas como `/c/$condoId/...`, hook `useMyCondos` (TanStack Query → `GET /condos/me`), switcher no header, persistência de "último condo selecionado", hook `useRoleGuard(min)` aplicado em itens de menu e em rotas sensíveis.

**O que NÃO faz:**

- Telas reais de Inbox, Tickets, Approvals, Settings (Planos 4+).
- Magic link, OAuth, recuperação de senha (ficam para um Plan de Auth Avançada se virar dor).
- Vinculação de Telegram do gestor (registrada em `docs/backlog.md`, adiada para Plan de Notificações).
- Realtime (preparação só no Plan de Inbox/Tickets).
- Catálogo de `ui/*` além do estritamente necessário para o shell.

**Decisões fixadas no brainstorm (2026-05-02):**

- Login: **email + senha** via Supabase. Sem OAuth/magic link nesta fatia.
- Condo ativo vive na **URL** (`/c/$condoId/...`), não só em store. Vantagens: deep-link, cada aba pode ter um condo diferente, refresh preserva estado.
- Itens de menu são **placeholders** desde já (Inbox, Tickets, Aprovações, Settings) — telas mostram "Em breve".
- Plano será entregue em **3 PRs** contra `develop`, na ordem 3.1 → 3.2 → 3.3.
- Telegram fica fora (ver `docs/backlog.md`).

**Dependências entre fatias:**

- 3.2 depende de 3.1 (precisa de sessão para mostrar o shell).
- 3.3 depende de 3.2 (precisa do switcher no header) e refatora o roteamento para incluir `condoId`.

---

## Convenções e lições do Plan 2 a respeitar

Seguir antes de propor alternativas (ver `CLAUDE.md` § "Padrões e convenções"):

- **Listeners de auth idempotentes:** `supabase.auth.onAuthStateChange` registra-se uma única vez; flag de módulo evita acúmulo em StrictMode/HMR (mesmo padrão do `theme.ts`).
- **`localStorage` defensivo:** persistir "último condo" usa `safeStorage()` (try/catch para Safari Private Browsing).
- **Botões com `type="button"`** por padrão; submit explícito só no form de login.
- **CSS Modules + tokens:** classes via `Record<Variant, string>` com `?? ""`. Sem cores ou espaçamentos crus.
- **Env eager:** módulos que importam `@/lib/env` quebram em testes sem env. Extrair lógica pura para sibling sem env (padrão de `assert-env.ts` e `auth.ts`).
- **routeTree.gen.ts** continua commitado.

---

## Mapa de arquivos (delta sobre o Plan 2)

```
src/
├── app/
│   ├── routes/
│   │   ├── __root.tsx                  # MODIFY: guard requireAuth (3.1)
│   │   ├── login.tsx                   # NEW (3.1)
│   │   ├── _app.tsx                    # NEW: layout shell wrapper (3.2)
│   │   ├── _app/
│   │   │   ├── index.tsx               # NEW: redirect → /c/<lastOrFirst>/inbox (3.3)
│   │   │   └── c/
│   │   │       └── $condoId/
│   │   │           ├── _layout.tsx     # NEW: valida condoId, injeta no header (3.3)
│   │   │           ├── inbox.tsx       # NEW: placeholder (3.2/3.3)
│   │   │           ├── tickets.tsx     # NEW: placeholder
│   │   │           ├── approvals.tsx   # NEW: placeholder
│   │   │           └── settings.tsx    # NEW: placeholder
│   │   └── no-access.tsx               # NEW: tela "sem condos" (3.3)
│   └── providers.tsx                   # MODIFY: configura bridge auth→api (3.1)
├── features/
│   ├── auth/
│   │   ├── LoginForm.tsx               # NEW (3.1)
│   │   ├── LoginForm.module.css        # NEW (3.1)
│   │   ├── LoginForm.test.tsx          # NEW (3.1)
│   │   └── useSignIn.ts                # NEW (3.1)
│   └── condo/
│       ├── useMyCondos.ts              # NEW (3.3)
│       ├── CondoSwitcher.tsx           # NEW (3.3)
│       ├── CondoSwitcher.module.css    # NEW (3.3)
│       ├── CondoSwitcher.test.tsx      # NEW (3.3)
│       └── roleHierarchy.ts            # NEW: pure (3.3)
├── stores/
│   ├── session.ts                      # NEW (3.1)
│   ├── session.test.ts                 # NEW (3.1)
│   ├── activeCondo.ts                  # NEW (3.3)
│   └── activeCondo.test.ts             # NEW (3.3)
├── ui/
│   ├── AppShell/
│   │   ├── AppShell.tsx                # NEW (3.2)
│   │   ├── AppShell.module.css         # NEW (3.2)
│   │   ├── Header.tsx                  # NEW (3.2)
│   │   ├── Sidebar.tsx                 # NEW (3.2)
│   │   ├── UserMenu.tsx                # NEW (3.2)
│   │   ├── ThemeToggle.tsx             # NEW (3.2)
│   │   ├── AppShell.stories.tsx        # NEW (3.2)
│   │   └── AppShell.test.tsx           # NEW (3.2)
│   └── Spinner/
│       ├── Spinner.tsx                 # NEW: usado no splash (3.1)
│       └── Spinner.module.css          # NEW (3.1)
├── lib/
│   ├── routeGuards.ts                  # NEW: requireAuth, requireRole (3.1/3.3)
│   └── safeStorage.ts                  # NEW: extrair de stores/theme.ts (3.3)
└── api/
    └── auth.ts                         # MODIFY: nada por enquanto, mas getActiveCondoId passa a vir do store/URL (3.3)
```

---

## Slice 3.1 — Auth fundamentals

### Objetivo da fatia

Após esta fatia: usuário consegue acessar `/login`, autenticar com email/senha do Supabase, ser redirecionado para uma rota privada (placeholder), e ter a sessão persistida entre refreshes. Rotas privadas redirecionam para `/login` se não autenticado, preservando `?redirect=`. Sem layout shell ainda — a rota privada `/` mostra apenas um placeholder com botão de logout.

### Branch e PR

- Branch: `feature/3.1-auth-fundamentals` saindo de `develop`.
- PR: contra `develop`, título `feat(auth): login email/senha, sessão Supabase e guard requireAuth (Plan 3.1)`.

---

### Task 1 — Sessão Supabase com store Zustand

**Files:**

- Create: `src/stores/session.ts`, `src/stores/session.test.ts`

---

- [ ] **Step 1.1: Criar `src/stores/session.ts`**

Store Zustand mantém `session` (do Supabase) e `status` (`loading | authenticated | anonymous`). Inicializa lendo `supabase.auth.getSession()` e registra listener `onAuthStateChange` **idempotente** (flag de módulo, mesmo padrão do `theme.ts`). Expõe `signIn(email, password)`, `signOut()`, getter `getAccessToken()`.

```ts
import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Status = "loading" | "authenticated" | "anonymous";

interface SessionState {
  session: Session | null;
  status: Status;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  status: "loading",
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    set({ session: data.session, status: "authenticated" });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, status: "anonymous" });
  },
}));

let attached = false;

export function initSession(): void {
  if (typeof window === "undefined" || attached) return;
  attached = true;

  void supabase.auth.getSession().then(({ data }) => {
    useSessionStore.setState({
      session: data.session,
      status: data.session ? "authenticated" : "anonymous",
    });
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    useSessionStore.setState({
      session,
      status: session ? "authenticated" : "anonymous",
    });
  });
}

export function getAccessToken(): string | undefined {
  return useSessionStore.getState().session?.access_token;
}
```

- [ ] **Step 1.2: Testes do store**

`src/stores/session.test.ts` cobre: `signIn` sucesso (atualiza store), `signIn` falha (relança erro), `signOut` (limpa store), `initSession` é idempotente. Mockar `supabase` via `vi.mock("@/lib/supabase", ...)` retornando objeto com `auth.signInWithPassword`, `auth.signOut`, `auth.getSession`, `auth.onAuthStateChange` controláveis. Usar `vi.spyOn` + `vi.restoreAllMocks()` no `afterEach`.

- [ ] **Step 1.3: Inicializar a sessão antes do `createRoot`**

Editar `src/main.tsx` para chamar `initSession()` síncrono antes do `createRoot`, mesmo lugar do `initTheme()`. Garante que o store já tem `status` correto antes do primeiro render (ainda assim começa em `loading` enquanto o `getSession` async resolve — tratado no guard).

---

### Task 2 — Bridge sessão → API client

**Files:**

- Modify: `src/app/providers.tsx`

---

- [ ] **Step 2.1: Conectar `getAccessToken` ao `applyAuthHeaders`**

Em `providers.tsx`, chamar `configureApiAuth({ getAccessToken: async () => getAccessToken(), getActiveCondoId: () => undefined })` antes de renderizar o `QueryClientProvider`. O `getActiveCondoId` fica `undefined` por enquanto — só passa a ter valor na fatia 3.3.

> **Por que async no getter:** `getAccessToken` síncrono já é suficiente hoje (Supabase mantém o token em memória no SDK), mas a interface `AuthGetters` é assíncrona desde o Plan 2 para deixar margem para refresh manual no futuro.

---

### Task 3 — Tela de login

**Files:**

- Create: `src/app/routes/login.tsx`, `src/features/auth/LoginForm.tsx`, `src/features/auth/LoginForm.module.css`, `src/features/auth/LoginForm.test.tsx`, `src/features/auth/useSignIn.ts`

---

- [ ] **Step 3.1: `useSignIn` hook**

Hook fino sobre `useSessionStore.signIn` que mapeia erros do Supabase para mensagens em pt-BR (`Invalid login credentials` → "Email ou senha inválidos", `Email not confirmed` → "Email não confirmado", default → "Não foi possível entrar"). Retorna `{ signIn, isPending, error }`.

- [ ] **Step 3.2: `LoginForm` (apresentacional)**

Form HTML nativo com `<input type="email" required>`, `<input type="password" required minLength={6}>`, `<Button type="submit">`. Estado controlado, `aria-invalid` e `aria-describedby` no input quando há erro. Submit chama `useSignIn().signIn`. Após sucesso, redireciona para `?redirect=` ou `/`.

- [ ] **Step 3.3: Rota `/login`**

`src/app/routes/login.tsx` — rota pública. `beforeLoad`: se `useSessionStore.getState().status === "authenticated"`, faz `throw redirect({ to: "/" })`. Renderiza `<LoginForm>`.

- [ ] **Step 3.4: Testes do `LoginForm`**

`@testing-library/user-event`: digita email + senha, clica submit, verifica chamada de `signIn`. Mocka `useSignIn` retornando função controlável + erro. Cobrir: campos obrigatórios bloqueiam submit (HTML validation), erro do hook aparece com `role="alert"`, sucesso navega para `?redirect=`.

---

### Task 4 — Guard `requireAuth`

**Files:**

- Create: `src/lib/routeGuards.ts`
- Modify: `src/app/routes/__root.tsx`

---

- [ ] **Step 4.1: `requireAuth` em `src/lib/routeGuards.ts`**

```ts
import { redirect } from "@tanstack/react-router";
import { useSessionStore } from "@/stores/session";

export function requireAuth({ location }: { location: { href: string } }) {
  const { status } = useSessionStore.getState();
  if (status === "anonymous") {
    throw redirect({
      to: "/login",
      search: { redirect: location.href },
    });
  }
}
```

- [ ] **Step 4.2: Splash de loading no `__root.tsx`**

Enquanto `status === "loading"`, mostrar `<Spinner>` em tela cheia. Sem isso há flash de `/login` quando há sessão válida ainda não resolvida pelo `getSession`.

```tsx
function RootLayout() {
  const status = useSessionStore((s) => s.status);
  if (status === "loading") return <FullPageSpinner />;
  return <Outlet />;
}
```

- [ ] **Step 4.3: Aplicar `requireAuth` na rota raiz privada placeholder**

Por enquanto a rota `/` (de `routes/index.tsx`) recebe `beforeLoad: requireAuth`. Conteúdo vira `<p>Logado como {email} <Button onClick={signOut}>Sair</Button></p>` — placeholder mínimo até a fatia 3.2 montar o shell.

- [ ] **Step 4.4: Componente `Spinner`**

`ui/Spinner/Spinner.tsx` — div com animação CSS keyframes (rotação 360°, 800ms linear infinite, `currentColor`). Variante `fullPage` usa `position: fixed; inset: 0; display: grid; place-items: center` no token `--color-bg`.

---

### Critério de pronto da Slice 3.1

- [ ] `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build` verdes.
- [ ] Login com credenciais válidas redireciona para `/` e mostra placeholder.
- [ ] Refresh em `/` com sessão ativa não pisca a tela de login.
- [ ] Acessar `/inbox` (não existe ainda) sem auth redireciona para `/login?redirect=...`.
- [ ] Logout volta para `/login` e não consegue voltar com history back.
- [ ] PR aberto contra `develop`, CI verde, preview Vercel funcional.

---

## Slice 3.2 — Layout shell

### Objetivo da fatia

Após esta fatia: usuário logado vê AppShell completo com header (logo, theme toggle, user menu placeholder do switcher), sidebar fixo desktop / drawer mobile, e navega entre placeholders `/inbox`, `/tickets`, `/approvals`, `/settings`. Theme toggle migra para o header. Sem `condoId` na URL ainda — vem na fatia 3.3.

### Branch e PR

- Branch: `feature/3.2-layout-shell` saindo de `develop` **após 3.1 mergeado**.
- PR: contra `develop`, título `feat(shell): AppShell com header, sidebar e theme toggle (Plan 3.2)`.

---

### Task 5 — `AppShell` e subcomponentes

**Files:**

- Create: `src/ui/AppShell/{AppShell.tsx,AppShell.module.css,Header.tsx,Sidebar.tsx,UserMenu.tsx,ThemeToggle.tsx,AppShell.stories.tsx,AppShell.test.tsx}`

---

- [ ] **Step 5.1: `AppShell` — grid de layout**

`AppShell.module.css` define grid responsivo:

- Desktop (>= `--bp-md`): `grid-template: "header header" auto "sidebar main" 1fr / 240px 1fr`.
- Mobile: `grid-template: "header" auto "main" 1fr`; sidebar vira `Dialog` Radix.

```tsx
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <Header />
      <Sidebar />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
```

- [ ] **Step 5.2: `Header`**

Componentes:

- Logo (texto "Zivy" em `--font-display`, ou SVG futuro).
- Slot de `CondoSwitcher` (placeholder vazio nesta fatia — comentário indicando "será preenchido na fatia 3.3").
- `ThemeToggle` (botão com ícone sol/lua, alterna `useThemeStore.setMode`).
- `UserMenu` (avatar circular com inicial do email; ao clicar abre Radix `DropdownMenu` com "Sair").

Em mobile (< `--bp-md`), header tem botão hamburger que abre o sidebar como `Dialog`.

- [ ] **Step 5.3: `Sidebar`**

Lista de itens com `Link` do TanStack Router. Cada item tem ícone (placeholder via emoji ou inline SVG simples) e label:

- Inbox → `/inbox`
- Tickets → `/tickets`
- Aprovações → `/approvals`
- Settings → `/settings`

Item ativo destaca via `data-status="active"` baseado em `Link`'s `activeProps`. Sem placeholder de role guard ainda — todos visíveis.

Mobile: dentro de `Dialog.Content`, fecha ao clicar em item (via callback).

- [ ] **Step 5.4: `UserMenu` com logout**

Radix `DropdownMenu`. Item "Sair" chama `useSessionStore.getState().signOut()` e navega para `/login`.

- [ ] **Step 5.5: `ThemeToggle`**

Botão que cicla `light → dark → system → light`. Ícone reflete o modo atual. Acessível: `aria-label="Tema atual: claro. Trocar para escuro."`.

- [ ] **Step 5.6: Stories do AppShell**

`AppShell.stories.tsx` renderiza o shell com children placeholder. Story para desktop e mobile (decorator com viewport).

- [ ] **Step 5.7: Testes**

- AppShell renderiza Header + Sidebar + main.
- UserMenu logout chama `signOut` (mockar store).
- ThemeToggle alterna o modo (assertar `data-theme` no `documentElement`).
- Mobile: clicar hamburger abre o `Dialog`, clicar item fecha.

---

### Task 6 — Layout route `_app` e placeholders

**Files:**

- Create: `src/app/routes/_app.tsx`, `src/app/routes/_app/inbox.tsx`, `src/app/routes/_app/tickets.tsx`, `src/app/routes/_app/approvals.tsx`, `src/app/routes/_app/settings.tsx`
- Modify: `src/app/routes/index.tsx`

---

- [ ] **Step 6.1: Layout route `_app`**

TanStack Router suporta layout routes via prefixo `_`. `routes/_app.tsx` aplica `requireAuth` no `beforeLoad` e renderiza `<AppShell><Outlet /></AppShell>`. Todas as rotas privadas ficam dentro de `routes/_app/`.

- [ ] **Step 6.2: Placeholders das telas**

Cada rota (`inbox.tsx`, `tickets.tsx`, `approvals.tsx`, `settings.tsx`) renderiza:

```tsx
export const Route = createFileRoute("/_app/inbox")({
  component: () => (
    <EmptyState title="Inbox" description="Em breve. Esta tela será implementada no Plan 4." />
  ),
});
```

Componente `EmptyState` pode ser inline em `ui/AppShell/EmptyState.tsx` (não precisa virar pacote).

- [ ] **Step 6.3: Index redireciona**

`routes/index.tsx` (que já existe) passa a redirecionar para `/inbox`:

```ts
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/inbox" });
  },
});
```

> Será revisitado na fatia 3.3 para apontar para `/c/$condoId/inbox`.

- [ ] **Step 6.4: Remover splash inicial do `__root`**

Como o splash de loading já existe na 3.1, garantir que ele continua válido (status do store ainda existe). Sem mudança aqui — só verificação.

---

### Critério de pronto da Slice 3.2

- [ ] `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build` verdes.
- [ ] Após login, usuário cai em `/inbox` dentro do AppShell.
- [ ] Sidebar navega entre os 4 placeholders sem reload.
- [ ] Theme toggle funciona dentro do header e persiste após refresh.
- [ ] Logout via UserMenu volta para `/login`.
- [ ] Mobile: hamburger abre sidebar drawer; clicar item fecha.
- [ ] Storybook do `AppShell` renderiza nas variantes desktop e mobile.
- [ ] PR contra `develop`, CI verde.

---

## Slice 3.3 — Condo switcher e role guards

### Objetivo da fatia

Após esta fatia: rotas privadas viram `/c/$condoId/...`. Após login, `useMyCondos` (TanStack Query → `GET /condos/me`) busca a lista; redireciona para o último condo selecionado (persistido em `localStorage`) ou para o primeiro da lista. Switcher no header troca o condo na URL. Itens de menu e rotas respeitam `useRoleGuard(min)`. Sem condos → tela `/no-access`.

### Branch e PR

- Branch: `feature/3.3-condo-switcher` saindo de `develop` **após 3.2 mergeado**.
- PR: contra `develop`, título `feat(condo): switcher com condo na URL e guards de role (Plan 3.3)`.

---

### Task 7 — `useMyCondos` e store de condo ativo

**Files:**

- Create: `src/features/condo/useMyCondos.ts`, `src/features/condo/roleHierarchy.ts`, `src/stores/activeCondo.ts`, `src/stores/activeCondo.test.ts`, `src/lib/safeStorage.ts`
- Modify: `src/stores/theme.ts` (importa `safeStorage` extraído)

---

- [ ] **Step 7.1: Extrair `safeStorage` para `src/lib/safeStorage.ts`**

A função vive hoje em `theme.ts`. Mover para `src/lib/safeStorage.ts` e fazer `theme.ts` importar de lá. Sem mudança comportamental — só compartilhamento.

- [ ] **Step 7.2: `roleHierarchy.ts` (puro)**

Espelha o domínio do Core. Sem deps de env, sem deps de React.

```ts
export type Role = "viewer" | "staff" | "manager" | "super_admin";

const rank: Record<Role, number> = {
  viewer: 1,
  staff: 2,
  manager: 3,
  super_admin: 4,
};

export function isAtLeast(actual: Role, required: Role): boolean {
  return rank[actual] >= rank[required];
}
```

- [ ] **Step 7.3: `useMyCondos`**

```ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export interface CondoMembership {
  condoId: string;
  condoName: string;
  condoSlug: string;
  role: Role;
}

export function useMyCondos() {
  return useQuery({
    queryKey: ["condos", "me"],
    queryFn: async () => {
      const { data, error } = await api.GET("/condos/me");
      if (error) throw error;
      return (data ?? []).map(toCondoMembership);
    },
    staleTime: 5 * 60_000,
  });
}
```

> **Pitfall:** o `applyAuthHeaders` por padrão tenta enviar `X-Condo-ID`. Para `/condos/me` o Core usa `AuthenticateNoCondoRequired` — header presente é apenas ignorado, **não** quebra a chamada (verificar no contrato Swagger). Caso o Core passe a rejeitar header inesperado, mover para um client paralelo sem `applyAuthHeaders`.

- [ ] **Step 7.4: Store `activeCondo`**

Persiste **apenas** o `lastSelectedCondoId` em `localStorage` via `safeStorage`. Não armazena o objeto inteiro — a fonte de verdade é o cache do TanStack Query. Expõe `getLastSelected()`, `setLastSelected(id)`.

```ts
import { safeStorage } from "@/lib/safeStorage";

const KEY = "zivy:lastCondoId";

export function getLastSelected(): string | undefined {
  return safeStorage.getItem(KEY) ?? undefined;
}
export function setLastSelected(id: string): void {
  safeStorage.setItem(KEY, id);
}
```

- [ ] **Step 7.5: Testes**

- `roleHierarchy.test.ts`: matriz de `isAtLeast` para todas as combinações.
- `activeCondo.test.ts`: get/set, falha de `setItem` é silenciosa.

---

### Task 8 — Roteamento com `condoId` na URL

**Files:**

- Create: `src/app/routes/_app/c/$condoId/_layout.tsx`, `src/app/routes/_app/c/$condoId/{inbox,tickets,approvals,settings}.tsx`, `src/app/routes/_app/index.tsx`, `src/app/routes/no-access.tsx`
- Delete: `src/app/routes/_app/{inbox,tickets,approvals,settings}.tsx` (movidos para baixo de `c/$condoId/`)
- Modify: `src/app/routes/index.tsx`, `src/app/routes/_app.tsx`, `src/api/client.ts` (ou onde estiver `configureApiAuth`)

---

- [ ] **Step 8.1: Mover placeholders para `_app/c/$condoId/`**

Mesma estrutura, agora com `condoId` no path. Exemplo:

```ts
export const Route = createFileRoute("/_app/c/$condoId/inbox")({
  component: InboxPage,
});
```

- [ ] **Step 8.2: Layout route `_app/c/$condoId/_layout.tsx`**

`beforeLoad`:

1. Buscar `useMyCondos` via `queryClient.ensureQueryData(...)`. Se erro de auth → o middleware do API client já joga; deixar propagar.
2. Validar que `params.condoId` existe na lista. Se não, `throw redirect({ to: "/no-access" })` (caso da lista vazia) ou para o primeiro condo válido (caso de id inválido).
3. Sincronizar `setLastSelected(params.condoId)`.

Renderiza `<Outlet />` direto (o `AppShell` já vem de `_app.tsx`).

- [ ] **Step 8.3: `_app/index.tsx` — escolha inicial de condo**

```ts
export const Route = createFileRoute("/_app/")({
  beforeLoad: async ({ context: { queryClient } }) => {
    const condos = await queryClient.ensureQueryData(myCondosQueryOptions());
    if (condos.length === 0) throw redirect({ to: "/no-access" });
    const lastId = getLastSelected();
    const target = condos.find((c) => c.condoId === lastId) ?? condos[0];
    throw redirect({
      to: "/c/$condoId/inbox",
      params: { condoId: target.condoId },
    });
  },
});
```

> **Decisão:** `useMyCondos` precisa virar query options exportável (`myCondosQueryOptions()`) para ser usado tanto no hook quanto no `ensureQueryData` do loader. Refatorar na 7.3.

- [ ] **Step 8.4: Rota `/no-access`**

Pública (não tem `requireAuth`? Tem — usuário precisa estar logado para descobrir que não tem acesso). Mensagem: "Sua conta não está vinculada a nenhum condomínio. Fale com o suporte."

- [ ] **Step 8.5: Bridge URL → API headers**

O `configureApiAuth` da fatia 3.1 passou `getActiveCondoId: () => undefined`. Agora precisa retornar o `condoId` do path ativo. Como ler a URL fora de componente?

**Padrão:** expor uma função-getter que lê do TanStack Router.

```ts
import { router } from "@/app/router";

function getActiveCondoIdFromUrl(): string | undefined {
  const match = router.state.matches.find((m) => "condoId" in (m.params ?? {}));
  return (match?.params as { condoId?: string } | undefined)?.condoId;
}
```

Atualizar `configureApiAuth({ ..., getActiveCondoId: getActiveCondoIdFromUrl })`.

> **Risco:** o `configureApiAuth` é chamado em `providers.tsx`, mas `router` é importado lá também — verificar circularidade. Se houver, mover a configuração para `main.tsx` após criar o router.

- [ ] **Step 8.6: Atualizar `routes/index.tsx`**

Já redireciona para `/inbox` (3.2). Agora redireciona para `/` que é a raiz do `_app` (que por sua vez resolve o condo). Equivalente: mudar para `redirect({ to: "/_app/" })` ou simplesmente deixar o redirect anterior — TanStack resolve via `_app/index`.

---

### Task 9 — `CondoSwitcher` e role guards

**Files:**

- Create: `src/features/condo/CondoSwitcher.tsx`, `src/features/condo/CondoSwitcher.module.css`, `src/features/condo/CondoSwitcher.test.tsx`, `src/lib/useRoleGuard.ts`
- Modify: `src/lib/routeGuards.ts` (adiciona `requireRole`), `src/ui/AppShell/{Header.tsx,Sidebar.tsx}`

---

- [ ] **Step 9.1: `CondoSwitcher` no header**

Radix `DropdownMenu` com lista de condos do `useMyCondos`. Item ativo (path param atual) destacado. Ao selecionar, navega para `/c/<novoId>/<currentSubpath>` preservando a sub-rota (ex.: estava em `/c/A/tickets`, troca para `/c/B/tickets`).

```tsx
const navigate = useNavigate();
const { condoId } = useParams({ strict: false });
const matches = useMatches();
const subPath = matches.at(-1)?.routeId.split("/").pop() ?? "inbox";

function handleSelect(newId: string) {
  navigate({ to: `/c/$condoId/${subPath}`, params: { condoId: newId } });
}
```

Estado de loading e erro no switcher: enquanto `isPending`, mostra placeholder; em `error`, mostra "Não foi possível carregar".

- [ ] **Step 9.2: Plug do switcher no Header**

Substituir o slot vazio deixado na 3.2 por `<CondoSwitcher>`.

- [ ] **Step 9.3: `useRoleGuard(min)`**

```ts
export function useRoleGuard(min: Role): { allowed: boolean } {
  const { condoId } = useParams({ strict: false });
  const { data } = useMyCondos();
  const role = data?.find((c) => c.condoId === condoId)?.role;
  return { allowed: !!role && isAtLeast(role, min) };
}
```

- [ ] **Step 9.4: `requireRole(min)` para rotas**

`src/lib/routeGuards.ts`:

```ts
export function requireRole(min: Role) {
  return async ({
    params,
    context,
  }: {
    params: { condoId?: string };
    context: { queryClient: QueryClient };
  }) => {
    const condos = await context.queryClient.ensureQueryData(myCondosQueryOptions());
    const role = condos.find((c) => c.condoId === params.condoId)?.role;
    if (!role || !isAtLeast(role, min)) {
      throw redirect({ to: "/c/$condoId/inbox", params: { condoId: params.condoId! } });
    }
  };
}
```

- [ ] **Step 9.5: Aplicar guards onde fizer sentido**

Para o Plan 3 (telas placeholder), aplicar **um** guard real em `/approvals` exigindo `manager`. As outras telas ficam abertas para todos os roles. Item de menu "Aprovações" no `Sidebar` esconde-se via `useRoleGuard` quando `!allowed` — assim demonstramos a UX completa sem bloquear placeholders.

- [ ] **Step 9.6: Testes**

- `CondoSwitcher`: troca de condo navega com sub-rota preservada (mockar `useMatches`/`useNavigate`).
- `useRoleGuard`: matriz de roles vs `min` (mockar `useMyCondos`, `useParams`).
- `requireRole`: `viewer` em rota `manager` redireciona; `manager` passa.
- Sidebar: item "Aprovações" some quando role < `manager`.

---

### Critério de pronto da Slice 3.3

- [ ] `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build` verdes.
- [ ] Após login, usuário com 1+ condos cai em `/c/<id>/inbox`; com 0 condos cai em `/no-access`.
- [ ] Refresh em `/c/<id>/tickets` mantém o condo (URL é fonte de verdade).
- [ ] Switcher troca o `condoId` na URL e a chamada de API seguinte manda `X-Condo-ID` novo (verificar via Network tab).
- [ ] Como `viewer`, item "Aprovações" não aparece no menu; navegação manual para `/c/<id>/approvals` redireciona para `inbox`.
- [ ] Como `manager`, item aparece e a rota carrega.
- [ ] PR contra `develop`, CI verde.

---

## Critério de pronto do Plan 3 (todas as fatias)

- [ ] PRs 3.1, 3.2, 3.3 mergeados em `develop`.
- [ ] `develop` em estado verde no Vercel preview.
- [ ] Smoke test manual no preview:
  - [ ] Login com conta `manager` válida funciona.
  - [ ] Logout funciona.
  - [ ] Refresh em qualquer rota privada não desloga.
  - [ ] Trocar condo via switcher funciona.
  - [ ] Tema claro/escuro/sistema funciona dentro do AppShell.
  - [ ] Mobile: drawer abre/fecha corretamente.
- [ ] CLAUDE.md atualizado com novos padrões surgidos durante a implementação (lições de code review).
- [ ] `develop` promovido para `main` em janela de release dedicada (PR `develop → main`).

---

## Riscos e mitigações

| Risco                                                                                       | Mitigação                                                                                                                      |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Race condition no startup: `getSession` async pinta `/login` por um frame antes de resolver | Splash de `Spinner` enquanto `status === "loading"` (Step 4.2)                                                                 |
| `applyAuthHeaders` manda `X-Condo-ID` em `/condos/me` e Core rejeita                        | Verificar no preview real; se rejeitar, criar client paralelo sem o middleware ou ler header opcional do Core                  |
| Refresh token expirado durante uso                                                          | Supabase SDK atualiza automaticamente; listener `onAuthStateChange` reage; se `signOut` for emitido, `requireAuth` redireciona |
| Circularidade `providers.tsx` ↔ `router.tsx` ao bridgar `getActiveCondoId`                  | Mover `configureApiAuth` para `main.tsx` após `createRouter` (Step 8.5)                                                        |
| Slice 3.3 muito grande                                                                      | Se ficar pesado, fatiar em 3.3a (switcher + URL) e 3.3b (role guards)                                                          |
| `useMatches`/`useParams` em código fora de componente para `getActiveCondoIdFromUrl`        | Usar `router.state.matches` direto, não hooks; testes cobrem                                                                   |

---

## Out of scope (para Plans futuros)

- **Plan 4 — Inbox:** lista de tickets do condo, filtros, busca, realtime preview.
- **Plan 5 — Ticket detail:** view completa de um ticket (mensagens, IA summary, ações).
- **Plan 6 — Approvals:** fila de moradores `PENDING` com aprovar/rejeitar.
- **Plan 7 — Settings:** perfil, preferências, gestão de blocos/unidades.
- **Plan de Notificações:** Telegram (deeplink de pareamento), web push, email, central in-app, preferências.
- **Plan de Auth Avançada:** magic link, OAuth, recuperação de senha, MFA.
