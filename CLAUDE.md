# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Zivy Dashboard — SPA (síndico + zelador) consumindo o [Core](https://github.com/ZivyApp/core) via REST e Supabase para auth/realtime. Deploy alvo: Vercel (estática + PWA).

## Stack

Vite 5 · React 19 · TypeScript strict · TanStack Router (file-based) · TanStack Query · Zustand · Radix · CSS Modules + design tokens · Supabase JS · Vitest + Testing Library · Storybook 8 · vite-plugin-pwa.

## Commands

```bash
npm run dev              # Vite em http://localhost:5173
npm run typecheck        # tsc --noEmit
npm run lint             # eslint . && stylelint 'src/**/*.css'
npm run test             # vitest run
npm run test:watch       # vitest watch
npx vitest run path/to/file.test.ts   # roda um único arquivo
npx vitest -t "nome"     # roda por nome do teste
npm run build            # tsc -b && vite build (gera dist/)
npm run preview          # serve o build
npm run storybook        # Storybook em :6006
npm run sync:swagger     # baixa swagger.json do Core (scripts/sync-swagger.sh)
npm run gen:api          # openapi-typescript → src/api/types.ts
```

Pré-requisito local: copiar `.env.example` → `.env.local` antes de `npm run dev`.

## Architecture

Alias `@/*` → `src/*` (configurado em `vite.config.ts`, `vitest.config.ts` e `tsconfig.json`).

- `src/main.tsx` monta o app dentro de `<Providers>` + `<RouterProvider>`.
- `src/app/`
  - `providers.tsx`: `QueryClient` único (staleTime 30s, sem refetch em focus, retry 1).
  - `router.tsx`: cria o router TanStack com `defaultPreload: "intent"` e registra o tipo via `declare module`.
  - `routes/`: rotas file-based; `routeTree.gen.ts` é **gerado** pelo `TanStackRouterVite` plugin — não editar à mão.
- `src/api/`: cliente REST (`openapi-fetch`) + `types.ts` gerado por `openapi-typescript` a partir de `src/api/openapi.json`. Para atualizar tipos: `npm run sync:swagger && npm run gen:api`.
- `src/stores/`: stores Zustand.
- `src/ui/`: componentes apresentacionais (CSS Modules, primitivos Radix). Storybook lê daqui.
- `src/design-tokens/`: tokens consumidos via CSS custom properties; `stylelint-declaration-strict-value` está ativo, então valores cru (cores, espaçamentos) tendem a ser barrados — usar tokens.
- `src/styles/global.css`: estilos globais e import de tokens.
- `src/test-setup.ts`: setup do Vitest (jsdom, jest-dom).

## TypeScript

`strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `noUnusedLocals/Parameters`. Ao acessar arrays/records, tratar o `undefined`. Ao tipar props opcionais, prefira omitir a chave em vez de `prop: undefined` (por causa de `exactOptionalPropertyTypes`).

## PWA

`vite-plugin-pwa` em `autoUpdate` com runtime caching para imagens (CacheFirst, 30d) e fontes (CacheFirst, 1y), e `navigateFallback: /index.html`. Mudanças em `manifest`/ícones exigem rebuild.

## Tests

Vitest com `globals: true` e ambiente `jsdom`; `@testing-library/jest-dom` carregado automaticamente. Co-localizar `*.test.ts(x)` ao lado do código.

## Segurança — checklist obrigatório antes de qualquer commit

O repositório é **público**. Qualquer dado sensível commitado fica exposto permanentemente (git history incluído).

**Nunca commitar:**

- [ ] Tokens, API keys ou senhas em qualquer arquivo `src/`
- [ ] Arquivos `.env`, `.env.local`, `.env.production` (já no `.gitignore` — nunca remover)
- [ ] Valores reais de `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` hardcoded no código
- [ ] JWTs, service role keys ou chaves privadas do Supabase
- [ ] Credenciais de banco, Railway, Vercel ou qualquer serviço externo
- [ ] Dados reais de usuários, condôminos ou unidades (mesmo em fixtures de teste)

**Antes de cada commit, verificar:**

- [ ] `git diff --staged` não contém nenhum segredo
- [ ] Qualquer novo arquivo de configuração não lê credenciais de lugar hardcoded
- [ ] Variáveis de ambiente só chegam via `import.meta.env.VITE_*` (lidas em `src/lib/env.ts`)
- [ ] Fixtures e mocks de teste usam dados fictícios (ex: `user@example.com`, não emails reais)

**Regras de arquitetura que protegem o repo:**

- Segredos vivem **apenas** nas env vars da Vercel (preview/production) e no `.env.local` local
- `src/lib/env.ts` é o único ponto de leitura de env vars — não usar `import.meta.env` diretamente em outros arquivos
- A `VITE_SUPABASE_ANON_KEY` é pública por design do Supabase (a proteção real são as Row Level Security policies no banco)
- A segurança de dados fica no **Core** (JWT, autorização por role, validação) — o frontend não precisa esconder lógica

**Se um segredo for commitado acidentalmente:**

1. Revogar/rotacionar a credencial imediatamente (não basta deletar o arquivo)
2. Usar `git filter-repo` ou contatar o GitHub Support para purgar o histórico
3. Avisar o time

## Branching e fluxo de PRs

- **`develop`** é a branch padrão do repositório e a base de todo trabalho de feature. Abrir PRs contra `develop`, não contra `main`.
- **`main`** é a branch de release/produção — recebe merges de `develop` em janelas de release (PR `develop → main`).
- Features saem de `develop`: `git checkout develop && git pull && git checkout -b feature/<nome>`.
- Hotfix de produção é a exceção: pode sair de `main` direto, e depois precisa ser portado para `develop` (merge ou cherry-pick).

## Deploy

Projeto Vercel: `zivy-dashboard` (org `adams-alves-projects`)

- **Production alias:** https://zivy-dashboard.vercel.app (deploys de `main`)
- Preview automático por PR via integração GitHub (incluindo PRs contra `develop`)
- Env vars gerenciadas no Vercel (não commitadas); para desenvolvimento local usar `.env.local`

## Estado atual do projeto

Scaffold completo (Plan 2) mergeado em `main` (PR #1, squash → `78fe26e`). `develop` sincronizada com `main` em 2026-05-02.

Conteúdo entregue:

- Design tokens, theme store (light/dark/system), componente `ui/Button`
- API client `openapi-fetch` + tipos gerados do Core staging
- Supabase singleton + bridge de auth no header da API
- TanStack Router + Query providers
- Storybook, PWA, CI GitHub Actions, deploy Vercel

Próximo: **Plan 3** — login screen, layout shell (header/sidebar), condo switcher, guards de role.

## Padrões e convenções (lições de code review)

Convenções fixadas a partir de revisões anteriores. Seguir antes de propor alternativas — se algo for desviar, justificar explicitamente.

### Inicialização do app

- `initTheme()` e qualquer aplicação inicial de `data-theme` **roda síncrono no `main.tsx` antes do `createRoot`**, nunca em `useEffect`. Em `useEffect`, o tema só aplica após o primeiro paint, causando flash of wrong theme (FOWT) para usuários com `dark` persistido.
- `document.getElementById('root')` deve usar checagem explícita com erro descritivo (`if (!el) throw new Error("...")`), não non-null assertion (`!`). A mensagem ajuda a diagnosticar `index.html` quebrado em dev.

### Listeners globais

- `matchMedia`, listeners de `window`, observers etc. devem ser **idempotentes** — flag de módulo evita acúmulo em StrictMode dev e HMR. Padrão:

  ```ts
  let attached = false;
  function handler() { /* ... */ }
  export function init() {
    if (typeof window === "undefined" || attached) return;
    window.matchMedia(...).addEventListener("change", handler);
    attached = true;
  }
  ```

### Storage e env

- Acesso a `localStorage` em caminhos críticos deve estar protegido por try/catch — Safari Private Browsing lança `SecurityError` em `setItem`. Ver `safeStorage()` em `src/stores/theme.ts`.
- `src/lib/env.ts` é avaliado **eagerly** no import e lança se vars faltarem. Qualquer arquivo que o importe transitivamente quebra em testes sem env setada. **Padrão:** extrair lógica pura para arquivo irmão sem import de env. Exemplo no repo: `src/api/auth.ts` (testável, sem env) é separado de `src/api/client.ts` (importa env e instancia o `api`).

### Componentes UI

- Botões default `type="button"` — evita submit acidental quando aninhados em `<form>`.
- CSS Modules: classes acessadas via `Record<Variant, string>` com fallback `?? ""` para satisfazer `noUncheckedIndexedAccess`.

### Bundle hygiene

- Imports de `@fontsource/*` usam **subset específico** (ex.: `@fontsource/ibm-plex-sans/latin-400.css`). O import default (`400.css` sem subset) carrega vietnamese/greek/cyrillic/latin-ext desnecessariamente — projeto é pt-BR e só precisa de `latin`.
- **Não instalar deps "para depois"**. Instalar quando for usar. Versões envelhecem e nomes mudam (ex.: `lucide-react@^1.14.0` é um pacote legado, atual é `^0.4xx.x`).

### Testes

- Mocks globais usam `vi.spyOn(...)` + `vi.restoreAllMocks()` em `afterEach`. **Nunca** `Object.defineProperty` direto — vaza entre testes.
- Testes de setters/actions verificam **side-effects**, não só state. Ex.: `setMode("dark")` deve assertar tanto `getState().mode === "dark"` quanto `document.documentElement.dataset.theme === "dark"`.
- Para módulos que dependem de env (`client.ts`, `supabase.ts`): extrair lógica pura para sibling sem env, testar lá.

### Tooling

- `.nvmrc` (`20`) + `engines.node` (`>=20`) fixados — evita drift entre dev local, CI e Vercel.
- PWA: `sw.js` e `manifest.webmanifest` têm `Cache-Control: public, max-age=0, must-revalidate` no `vercel.json`. Sem isso, mobile não recebe updates do service worker.
- `routeTree.gen.ts` (TanStack Router) é **commitado intencionalmente** — aceita custo de conflito de merge em troca de CI sem step de geração.

## Code review graph (MCP)

Este projeto tem grafo de conhecimento (ver instrução global). Antes de Grep/Glob/Read amplos, prefira `semantic_search_nodes`, `query_graph`, `detect_changes`, `get_impact_radius`. O grafo atualiza via hooks.
