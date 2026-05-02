# Dashboard Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Esqueleto produtivo do painel web Zivy: Vite+React+TS strict, design tokens da identity REVISADA, primitivas `ui/*` prontas para escala, integração com Core via `openapi-fetch`, deploy Vercel automatizado.

**Architecture:** SPA pura em repo próprio `ZivyApp/dashboard`. Frontend consome staging do Core (`https://core-production-c748.up.railway.app`) e Supabase para auth/realtime. Sem features de produto neste plano — só fundações, tooling e prova de pattern com 1 componente (`Button`). Features (login, inbox, tickets, aprovações) ficam para Planos 3+.

**Tech Stack:** Vite 5, React 18, TypeScript strict, TanStack Router/Query, Zustand, CSS Modules + tokens vanilla, Radix, openapi-fetch, vite-plugin-pwa, Vitest, Storybook, ESLint flat, Stylelint, lefthook, Vercel.

**Spec de referência:** `docs/superpowers/specs/2026-04-23-zivy-frontend-stack-design.md` + `2026-04-23-zivy-visual-identity-design-REVISADO.md`.

---

## Escopo e premissas

**O que este plano faz:**

1. Inicializa repo `dashboard/` com Vite + React + TypeScript strict.
2. Configura tooling: ESLint flat, Prettier, Stylelint, lefthook, commitlint.
3. Implementa estrutura de pastas conforme spec §3.
4. Materializa design tokens da identity REVISADA em `src/design-tokens/`.
5. Constrói infra de tema (light/dark/system) com Zustand persist.
6. Entrega 1 componente `ui/Button` completo (tsx + module.css + test + story) como prova do pattern.
7. Configura API client: `scripts/sync-swagger.sh`, geração de tipos, client base com header de auth.
8. Configura Supabase singleton (sem UI de login — fica para Plano 3).
9. Wireia TanStack Router (root + 1 rota placeholder), TanStack Query providers, theme provider.
10. Configura Storybook local com tokens.
11. Configura PWA (manifest + service worker via vite-plugin-pwa).
12. CI GitHub Actions (typecheck + lint + test + build + sync-swagger-check).
13. Deploy Vercel: cria projeto via CLI, conecta repo, seta env vars, habilita preview por PR.

**O que NÃO faz:**

- Telas de login, inbox, ticket detail, approval queue, settings (Planos 3+).
- Implementação de Realtime no client (apenas helper preparatório).
- Switcher de condo, toolbar, layout shell completo (Plano 3).
- Catálogo completo de `ui/*` (só `Button` neste plano).
- Domínio custom no Vercel (`painel.zivy.app`) — fica fora.

**Decisões fixadas:**

- Repo: `ZivyApp/dashboard` (já existe, vazio).
- Local: `/home/adams/Documentos/Projetos/ZivyApp/dashboard/` (já clonado).
- Branch base: `main`. Branch de trabalho: `feature/scaffold`.
- API base URL no scaffold aponta para staging do Core (`https://core-production-c748.up.railway.app`).

---

## Mapa de arquivos (visão final do scaffold)

```
dashboard/
├── .github/workflows/
│   └── ci.yml
├── .vscode/
│   └── settings.json
├── public/
│   ├── icons/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── icon-maskable-512.png
│   └── favicon.svg
├── scripts/
│   └── sync-swagger.sh
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── providers.tsx
│   │   ├── router.tsx
│   │   └── routes/
│   │       ├── __root.tsx
│   │       └── index.tsx
│   ├── design-tokens/
│   │   ├── colors.css
│   │   ├── typography.css
│   │   ├── space.css
│   │   ├── radius.css
│   │   ├── shadow.css
│   │   ├── motion.css
│   │   ├── breakpoints.css
│   │   ├── z-index.css
│   │   └── index.css
│   ├── ui/
│   │   └── Button/
│   │       ├── Button.tsx
│   │       ├── Button.module.css
│   │       ├── Button.test.tsx
│   │       └── Button.stories.tsx
│   ├── api/
│   │   ├── openapi.json
│   │   ├── types.ts
│   │   └── client.ts
│   ├── stores/
│   │   └── theme.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── env.ts
│   └── styles/
│       └── global.css
├── .env.example
├── .gitignore
├── .prettierrc
├── .stylelintrc.json
├── commitlint.config.js
├── eslint.config.js
├── index.html
├── lefthook.yml
├── package.json
├── README.md
├── tsconfig.json
├── tsconfig.node.json
├── vercel.json
└── vite.config.ts
```

---

## Task 1 — Bootstrap do projeto Vite

**Files:**

- Create: `dashboard/package.json`, `dashboard/vite.config.ts`, `dashboard/tsconfig.json`, `dashboard/tsconfig.node.json`, `dashboard/index.html`, `dashboard/src/main.tsx`, `dashboard/.gitignore`, `dashboard/README.md`

---

- [ ] **Step 1.1: Trabalhar em branch limpa**

```bash
cd /home/adams/Documentos/Projetos/ZivyApp/dashboard
git checkout main
git pull --ff-only
git checkout -b feature/scaffold
```

- [ ] **Step 1.2: Inicializar package.json mínimo**

Create `dashboard/package.json`:

```json
{
  "name": "zivy-dashboard",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . && stylelint 'src/**/*.css'",
    "format": "prettier --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "gen:api": "openapi-typescript src/api/openapi.json -o src/api/types.ts",
    "sync:swagger": "bash scripts/sync-swagger.sh"
  }
}
```

- [ ] **Step 1.3: Instalar dependências runtime**

Run:

```bash
npm install react react-dom @tanstack/react-router @tanstack/react-query @tanstack/router-devtools \
  zustand @supabase/supabase-js openapi-fetch \
  @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-toast @radix-ui/react-tooltip \
  lucide-react cmdk react-day-picker \
  @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono
```

- [ ] **Step 1.4: Instalar dependências de dev**

Run:

```bash
npm install -D vite @vitejs/plugin-react typescript \
  @types/react @types/react-dom \
  vite-plugin-pwa workbox-window \
  @tanstack/router-plugin \
  vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-jsx-a11y \
  prettier \
  stylelint stylelint-config-standard stylelint-declaration-strict-value \
  openapi-typescript \
  @commitlint/cli @commitlint/config-conventional \
  storybook @storybook/react-vite @storybook/addon-essentials @storybook/addon-themes \
  lefthook
```

> **Nota:** algumas versões de Storybook 8 instalam plugins automaticamente via `npx storybook init`. Aqui pegamos apenas o necessário para o Task 11. Se faltar algum addon, instalar pontualmente.

- [ ] **Step 1.5: Criar `vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: "./src/app/routes",
      generatedRouteTree: "./src/app/routeTree.gen.ts",
    }),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/icon-maskable-512.png",
      ],
      manifest: {
        name: "Zivy",
        short_name: "Zivy",
        description: "Painel do síndico Zivy",
        theme_color: "#2F5D50",
        background_color: "#F5F4EF",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "font",
            handler: "CacheFirst",
            options: {
              cacheName: "fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
    css: true,
  },
});
```

- [ ] **Step 1.6: Criar `tsconfig.json` strict**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"],
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "src/test-setup.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 1.7: Criar `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 1.8: Criar `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#2F5D50" />
    <title>Zivy</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 1.9: Criar `src/main.tsx` mínimo (vai ser ampliado no Task 9)**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main style={{ padding: 24 }}>Zivy dashboard scaffold</main>
  </StrictMode>,
);
```

- [ ] **Step 1.10: Criar `src/styles/global.css` mínimo (será ampliado no Task 4)**

```css
* {
  box-sizing: border-box;
}
html,
body,
#root {
  height: 100%;
  margin: 0;
}
body {
  font-family: system-ui, sans-serif;
}
```

- [ ] **Step 1.11: Criar `.gitignore`**

```
node_modules
dist
dist-ssr
*.local
.env
.env.local
.DS_Store
.vite
storybook-static
coverage
src/app/routeTree.gen.ts
```

- [ ] **Step 1.12: Atualizar README**

Substituir `dashboard/README.md`:

````markdown
# Zivy Dashboard

Painel web do Zivy (síndico + zelador). SPA estática consumindo o [Core](https://github.com/ZivyApp/core) via REST e Supabase para auth/realtime.

## Stack

Vite 5 · React 18 · TypeScript strict · TanStack Router/Query · Zustand · CSS Modules + tokens · Radix · Supabase · Vitest · Storybook · Vercel.

## Comandos

```bash
npm install            # instalar deps
npm run dev            # http://localhost:5173
npm run typecheck
npm run lint
npm run test
npm run build
npm run storybook
npm run sync:swagger   # baixa swagger.json do Core
npm run gen:api        # gera src/api/types.ts
```
````

## Variáveis de ambiente

Copie `.env.example` → `.env.local` e preencha.

## Documentação

Specs e plano em `core/docs/superpowers/`.

````

- [ ] **Step 1.13: Smoke build**

Run:
```bash
npm run build
````

Expected: build OK. Erros relacionados ao TanStack Router (route tree não gerado) podem aparecer e serão resolvidos no Task 9. Se passar até "transforming...", basta. Se falhar pesado, revisar Steps 1.5-1.7.

> **Skip se falhar:** o build final só precisa passar após Task 9. Aqui a meta é só não ter erro de instalação/config.

- [ ] **Step 1.14: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.node.json index.html .gitignore README.md src/main.tsx src/styles/global.css
git commit -m "chore(scaffold): bootstrap Vite + React + TS strict project"
```

---

## Task 2 — Tooling: lint, format, hooks

**Files:**

- Create: `dashboard/eslint.config.js`, `dashboard/.prettierrc`, `dashboard/.stylelintrc.json`, `dashboard/lefthook.yml`, `dashboard/commitlint.config.js`, `dashboard/.vscode/settings.json`

---

- [ ] **Step 2.1: ESLint flat config**

Create `dashboard/eslint.config.js`:

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default tseslint.config(
  { ignores: ["dist", "storybook-static", "coverage", "src/app/routeTree.gen.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.node.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { "react-hooks": reactHooks, "jsx-a11y": jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
);
```

- [ ] **Step 2.2: Prettier**

Create `dashboard/.prettierrc`:

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all"
}
```

- [ ] **Step 2.3: Stylelint reforça tokens**

Create `dashboard/.stylelintrc.json`:

```json
{
  "extends": ["stylelint-config-standard"],
  "plugins": ["stylelint-declaration-strict-value"],
  "rules": {
    "scale-unlimited/declaration-strict-value": [
      [
        "color",
        "background-color",
        "border-color",
        "fill",
        "stroke",
        "padding",
        "padding-top",
        "padding-right",
        "padding-bottom",
        "padding-left",
        "margin",
        "margin-top",
        "margin-right",
        "margin-bottom",
        "margin-left",
        "gap",
        "border-radius",
        "box-shadow",
        "z-index",
        "font-size",
        "line-height"
      ],
      {
        "ignoreValues": [
          "currentColor",
          "transparent",
          "inherit",
          "initial",
          "unset",
          "auto",
          "none",
          "0",
          "0px",
          "100%"
        ],
        "disableFix": true
      }
    ],
    "selector-class-pattern": null,
    "no-descending-specificity": null,
    "custom-property-pattern": "^[a-z][a-z0-9-]*$"
  },
  "overrides": [
    {
      "files": ["src/design-tokens/**/*.css"],
      "rules": { "scale-unlimited/declaration-strict-value": null }
    },
    {
      "files": ["src/styles/global.css"],
      "rules": { "scale-unlimited/declaration-strict-value": null }
    }
  ]
}
```

- [ ] **Step 2.4: lefthook (paridade com Core)**

Create `dashboard/lefthook.yml`:

```yaml
pre-commit:
  parallel: true
  commands:
    eslint:
      glob: "*.{ts,tsx,js}"
      run: npx eslint --fix {staged_files}
      stage_fixed: true
    prettier:
      glob: "*.{ts,tsx,js,css,json,md,yml,yaml}"
      run: npx prettier --write {staged_files}
      stage_fixed: true
    stylelint:
      glob: "src/**/*.css"
      run: npx stylelint --fix {staged_files}
      stage_fixed: true

commit-msg:
  commands:
    commitlint:
      run: npx commitlint --edit {1}
```

- [ ] **Step 2.5: commitlint**

Create `dashboard/commitlint.config.js`:

```js
export default { extends: ["@commitlint/config-conventional"] };
```

- [ ] **Step 2.6: Instalar lefthook hooks**

Run:

```bash
npx lefthook install
```

- [ ] **Step 2.7: VSCode settings**

Create `dashboard/.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

- [ ] **Step 2.8: Smoke lint**

Run:

```bash
npm run lint
```

Expected: passa (pode haver 0 issues; arquivos quase vazios ainda).

- [ ] **Step 2.9: Commit**

```bash
git add eslint.config.js .prettierrc .stylelintrc.json lefthook.yml commitlint.config.js .vscode/settings.json
git commit -m "chore(scaffold): add ESLint, Prettier, Stylelint, lefthook, commitlint"
```

---

## Task 3 — Estrutura de pastas

**Files:**

- Create: diretórios vazios + `.gitkeep` em cada um listado abaixo

---

- [ ] **Step 3.1: Criar diretórios e .gitkeep**

Run:

```bash
mkdir -p src/app/routes src/design-tokens src/ui/Button src/api src/stores src/lib src/styles \
         scripts public/icons .github/workflows
touch src/app/routes/.gitkeep src/design-tokens/.gitkeep src/ui/.gitkeep src/api/.gitkeep \
      src/stores/.gitkeep src/lib/.gitkeep public/icons/.gitkeep
```

- [ ] **Step 3.2: Commit (será preenchido nos próximos tasks)**

```bash
git add src/ scripts/ public/ .github/
git commit -m "chore(scaffold): create folder structure per spec §3"
```

---

## Task 4 — Design tokens da identity REVISADA

**Files:**

- Create: `src/design-tokens/{colors,typography,space,radius,shadow,motion,breakpoints,z-index,index}.css`
- Modify: `src/styles/global.css`

---

- [ ] **Step 4.1: `colors.css`**

Create `src/design-tokens/colors.css`:

```css
:root {
  --brand: #2f5d50;
  --brand-hover: #254a40;
  --brand-soft: #e8efe4;
  --brand-muted: #c5d9ce;

  --bg-canvas: #f5f4ef;
  --bg-surface: #ffffff;
  --bg-sidebar: #edece4;
  --bg-muted: #f9f8f3;
  --bg-elevated: #ffffff;

  --border: #eae8df;
  --border-strong: #ddd9cb;

  --fg-primary: #1c1c1c;
  --fg-secondary: #5a5a55;
  --fg-tertiary: #8a867c;
  --fg-disabled: #b5b2a8;
  --fg-inverse: #ffffff;

  --status-urgent-bg: #fce9d4;
  --status-urgent-fg: #8b4a1c;
  --status-alta-bg: #f5e5d3;
  --status-alta-fg: #8b5a2b;
  --status-media-bg: #e5ede0;
  --status-media-fg: #3f5a2e;
  --status-onhold-bg: #e8e4f0;
  --status-onhold-fg: #5a4a7a;

  --success: #4a7c59;
  --danger: #b54a3c;
  --danger-soft-bg: #f5e0dc;
  --danger-soft-fg: #8b3a2e;
  --warning-bg: #c9a03a;
  --warning-fg: #5a4a1c;
  --accent-amber: #e8b14a;
  --info-bg: #e0ecf5;
  --info-fg: #4a7a9e;
}

:root[data-theme="dark"] {
  --brand: #7bae9e;
  --brand-hover: #93c1b2;
  --brand-soft: #2f4842;
  --brand-muted: #4a6b62;

  --bg-canvas: #1a1d1c;
  --bg-surface: #242826;
  --bg-sidebar: #1f2221;
  --bg-muted: #2a2e2c;
  --bg-elevated: #2d3230;

  --border: #353a38;
  --border-strong: #3f4543;

  --fg-primary: #e8e6de;
  --fg-secondary: #a8a49a;
  --fg-tertiary: #787570;
  --fg-disabled: #5a5e5c;
  --fg-inverse: #1a1d1c;

  --status-urgent-bg: #5a3f2b;
  --status-urgent-fg: #e8b48a;
  --status-alta-bg: #4f402a;
  --status-alta-fg: #dcb983;
  --status-media-bg: #2e3f2a;
  --status-media-fg: #a8c89d;
  --status-onhold-bg: #3a3048;
  --status-onhold-fg: #b8a8d8;

  --success: #7bae9e;
  --danger: #d97757;
  --danger-soft-bg: #4a3028;
  --danger-soft-fg: #e8a898;
  --warning-bg: #8a7030;
  --warning-fg: #f5d88a;
  --accent-amber: #f5c66a;
  --info-bg: #2a4050;
  --info-fg: #a8c8e0;
}
```

- [ ] **Step 4.2: `typography.css`**

Create `src/design-tokens/typography.css`:

```css
:root {
  --font-sans: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "SF Mono", monospace;

  --fs-xs: 0.75rem;
  --fs-sm: 0.875rem;
  --fs-base: 1rem;
  --fs-lg: 1.125rem;
  --fs-xl: 1.25rem;
  --fs-2xl: 1.5rem;
  --fs-3xl: 1.875rem;
  --fs-4xl: 2.25rem;

  --lh-tight: 1.2;
  --lh-snug: 1.35;
  --lh-normal: 1.5;
  --lh-relaxed: 1.65;

  --fw-regular: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;

  --tracking-tight: -0.01em;
  --tracking-normal: 0;
  --tracking-wide: 0.02em;
}
```

- [ ] **Step 4.3: `space.css`**

Create `src/design-tokens/space.css`:

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;
}
```

- [ ] **Step 4.4: `radius.css`**

Create `src/design-tokens/radius.css`:

```css
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-pill: 999px;
}
```

- [ ] **Step 4.5: `shadow.css`**

Create `src/design-tokens/shadow.css`:

```css
:root {
  --shadow-sm: 0 1px 2px rgba(28, 28, 28, 0.04);
  --shadow-md: 0 4px 12px rgba(28, 28, 28, 0.08);
  --shadow-lg: 0 12px 32px rgba(28, 28, 28, 0.12);
  --shadow-focus: 0 0 0 3px rgba(47, 93, 80, 0.25);
}
:root[data-theme="dark"] {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.5);
  --shadow-focus: 0 0 0 3px rgba(123, 174, 158, 0.4);
}
```

- [ ] **Step 4.6: `motion.css`**

Create `src/design-tokens/motion.css`:

```css
:root {
  --duration-instant: 80ms;
  --duration-fast: 150ms;
  --duration-base: 220ms;
  --duration-slow: 320ms;
  --duration-theme: 300ms;

  --easing-standard: cubic-bezier(0.2, 0.7, 0.2, 1);
  --easing-emphasized: cubic-bezier(0.3, 0, 0.1, 1);
  --easing-decelerated: cubic-bezier(0, 0, 0.2, 1);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4.7: `breakpoints.css`**

Create `src/design-tokens/breakpoints.css`:

```css
:root {
  --bp-sm: 480px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
  --bp-2xl: 1536px;
}
```

- [ ] **Step 4.8: `z-index.css`**

Create `src/design-tokens/z-index.css`:

```css
:root {
  --z-base: 0;
  --z-sticky: 10;
  --z-dropdown: 100;
  --z-toast: 200;
  --z-drawer: 300;
  --z-modal: 400;
  --z-popover: 500;
  --z-skip-link: 999;
}
```

- [ ] **Step 4.9: `index.css` agrega tudo**

Create `src/design-tokens/index.css`:

```css
@import "./colors.css";
@import "./typography.css";
@import "./space.css";
@import "./radius.css";
@import "./shadow.css";
@import "./motion.css";
@import "./breakpoints.css";
@import "./z-index.css";
```

- [ ] **Step 4.10: `global.css` ampliado**

Replace `src/styles/global.css`:

```css
@import "@fontsource/ibm-plex-sans/400.css";
@import "@fontsource/ibm-plex-sans/500.css";
@import "@fontsource/ibm-plex-sans/600.css";
@import "@fontsource/ibm-plex-sans/700.css";
@import "@/design-tokens/index.css";

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
  margin: 0;
}

html {
  color-scheme: light dark;
}

html[data-theme="light"] {
  color-scheme: light;
}

html[data-theme="dark"] {
  color-scheme: dark;
}

body {
  font-family: var(--font-sans);
  font-size: var(--fs-base);
  line-height: var(--lh-normal);
  color: var(--fg-primary);
  background: var(--bg-canvas);
  -webkit-font-smoothing: antialiased;
}

tbody,
.stat,
.mono {
  font-feature-settings: "tnum" 1;
}

html.theme-transitioning,
html.theme-transitioning * {
  transition:
    background-color var(--duration-theme) var(--easing-standard),
    color var(--duration-theme) var(--easing-standard),
    border-color var(--duration-theme) var(--easing-standard) !important;
}

:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}
```

- [ ] **Step 4.11: Smoke build**

Run:

```bash
npm run build
```

Expected: build OK (CSS importado sem erro). Erros do TanStack Router vão aparecer ainda; ignorar até Task 9.

- [ ] **Step 4.12: Commit**

```bash
git add src/design-tokens/ src/styles/global.css
git commit -m "feat(tokens): materialize design tokens from visual identity REVISADA"
```

---

## Task 5 — Theme switching infra

**Files:**

- Create: `src/stores/theme.ts`, `src/stores/theme.test.ts`

---

- [ ] **Step 5.1: Test do store de tema (TDD)**

Create `src/stores/theme.test.ts`:

```ts
import { describe, expect, it, beforeEach } from "vitest";
import { useThemeStore, applyTheme } from "./theme";

describe("themeStore", () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: "system" });
    document.documentElement.removeAttribute("data-theme");
  });

  it("default mode é system", () => {
    expect(useThemeStore.getState().mode).toBe("system");
  });

  it("setMode atualiza o estado", () => {
    useThemeStore.getState().setMode("dark");
    expect(useThemeStore.getState().mode).toBe("dark");
  });

  it("applyTheme grava data-theme=dark quando mode=dark", () => {
    applyTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("applyTheme grava data-theme=light quando mode=light", () => {
    applyTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("applyTheme com system grava conforme prefers-color-scheme", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }),
    });
    applyTheme("system");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
```

- [ ] **Step 5.2: Setup do Vitest**

Create `src/test-setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5.3: Rodar teste — confirma falha**

Run:

```bash
npx vitest run src/stores/theme.test.ts
```

Expected: FAIL — `theme` module ainda não existe.

- [ ] **Step 5.4: Implementar `src/stores/theme.ts`**

```ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "system",
      setMode: (mode) => {
        set({ mode });
        applyTheme(mode);
      },
    }),
    { name: "zivy-theme", storage: createJSONStorage(() => localStorage) },
  ),
);

export function applyTheme(mode: ThemeMode) {
  const resolved =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  document.documentElement.setAttribute("data-theme", resolved);
}

export function initTheme() {
  applyTheme(useThemeStore.getState().mode);
  if (typeof window !== "undefined") {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (useThemeStore.getState().mode === "system") applyTheme("system");
    });
  }
}
```

- [ ] **Step 5.5: Rodar testes — passa**

Run: `npx vitest run src/stores/theme.test.ts`
Expected: 5 PASS.

- [ ] **Step 5.6: Commit**

```bash
git add src/stores/theme.ts src/stores/theme.test.ts src/test-setup.ts
git commit -m "feat(theme): add Zustand theme store with light/dark/system + persist"
```

---

## Task 6 — Componente `ui/Button` (prova do pattern)

**Files:**

- Create: `src/ui/Button/{Button.tsx, Button.module.css, Button.test.tsx, Button.stories.tsx}`

---

- [ ] **Step 6.1: Test do Button (TDD)**

Create `src/ui/Button/Button.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renderiza children", () => {
    render(<Button>Salvar</Button>);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });

  it("chama onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("aplica variant=primary por padrão", () => {
    render(<Button>X</Button>);
    expect(screen.getByRole("button").className).toContain("primary");
  });

  it("aplica variant=ghost quando passado", () => {
    render(<Button variant="ghost">X</Button>);
    expect(screen.getByRole("button").className).toContain("ghost");
  });

  it("desabilita quando disabled=true", () => {
    render(<Button disabled>X</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

- [ ] **Step 6.2: Rodar test — confirma falha**

Run: `npx vitest run src/ui/Button/Button.test.tsx`
Expected: FAIL — módulo `Button` não existe.

- [ ] **Step 6.3: Implementar `Button.tsx`**

```tsx
import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "primary", size = "md", className, ...rest }: ButtonProps) {
  const cls = [styles.button, styles[variant], styles[size], className].filter(Boolean).join(" ");
  return <button className={cls} {...rest} />;
}
```

- [ ] **Step 6.4: Implementar `Button.module.css`**

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-sans);
  font-weight: var(--fw-medium);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--easing-standard),
    border-color var(--duration-fast) var(--easing-standard);
}

.button:disabled {
  cursor: not-allowed;
  color: var(--fg-disabled);
}

.sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--fs-sm);
}
.md {
  padding: var(--space-2) var(--space-4);
  font-size: var(--fs-base);
}
.lg {
  padding: var(--space-3) var(--space-6);
  font-size: var(--fs-lg);
}

.primary {
  background: var(--brand);
  color: var(--fg-inverse);
}
.primary:hover:not(:disabled) {
  background: var(--brand-hover);
}

.secondary {
  background: var(--bg-surface);
  color: var(--fg-primary);
  border-color: var(--border-strong);
}
.secondary:hover:not(:disabled) {
  background: var(--bg-muted);
}

.ghost {
  background: transparent;
  color: var(--fg-primary);
}
.ghost:hover:not(:disabled) {
  background: var(--bg-muted);
}

.danger {
  background: var(--danger);
  color: var(--fg-inverse);
}
.danger:hover:not(:disabled) {
  filter: brightness(0.95);
}
```

- [ ] **Step 6.5: Rodar testes — passa**

Run: `npx vitest run src/ui/Button/Button.test.tsx`
Expected: 5 PASS.

- [ ] **Step 6.6: Story para Storybook (será aproveitada no Task 11)**

Create `src/ui/Button/Button.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta = {
  title: "UI/Button",
  component: Button,
  args: { children: "Salvar" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Danger: Story = { args: { variant: "danger" } };
export const Disabled: Story = { args: { disabled: true } };
export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <Button size="sm">SM</Button>
      <Button size="md">MD</Button>
      <Button size="lg">LG</Button>
    </div>
  ),
};
```

- [ ] **Step 6.7: Commit**

```bash
git add src/ui/Button/
git commit -m "feat(ui): add Button component with variants and tests"
```

---

## Task 7 — API client + sync swagger

**Files:**

- Create: `scripts/sync-swagger.sh`, `src/api/client.ts`, `src/lib/env.ts`
- Generate: `src/api/openapi.json`, `src/api/types.ts`

---

- [ ] **Step 7.1: `scripts/sync-swagger.sh`**

Create `scripts/sync-swagger.sh`:

```bash
#!/usr/bin/env bash
# Sincroniza swagger.json do Core para src/api/openapi.json e regenera tipos.
# Uso:
#   bash scripts/sync-swagger.sh                  # baixa do staging
#   CORE_SWAGGER_URL=http://localhost:8080/swagger/doc.json bash scripts/sync-swagger.sh
set -euo pipefail

URL="${CORE_SWAGGER_URL:-https://core-production-c748.up.railway.app/swagger/doc.json}"
OUT="src/api/openapi.json"

echo "→ baixando $URL"
curl -fsS "$URL" -o "$OUT"

echo "→ formatando"
node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync('$OUT','utf8')); fs.writeFileSync('$OUT', JSON.stringify(j, null, 2));"

echo "→ gerando tipos"
npm run gen:api

echo "✓ swagger sincronizado"
```

Tornar executável:

```bash
chmod +x scripts/sync-swagger.sh
```

- [ ] **Step 7.2: Rodar sync inicial**

Run:

```bash
npm run sync:swagger
```

Expected: arquivos `src/api/openapi.json` e `src/api/types.ts` gerados. Se o staging estiver fora, usar `CORE_SWAGGER_URL=...` apontando para uma instância up.

> Se não houver `/swagger/doc.json` exposto no Core, conferir `cmd/server/main.go` por wiring do swag handler e ajustar o caminho. Path padrão da `swag` é `/swagger/doc.json`.

- [ ] **Step 7.3: `src/lib/env.ts`**

Create `src/lib/env.ts`:

```ts
const required = (name: string, value: string | undefined): string => {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
};

export const env = {
  SUPABASE_URL: required("VITE_SUPABASE_URL", import.meta.env.VITE_SUPABASE_URL),
  SUPABASE_ANON_KEY: required("VITE_SUPABASE_ANON_KEY", import.meta.env.VITE_SUPABASE_ANON_KEY),
  CORE_API_URL: required("VITE_CORE_API_URL", import.meta.env.VITE_CORE_API_URL),
};
```

- [ ] **Step 7.4: `src/api/client.ts`**

Create `src/api/client.ts`:

```ts
import createClient from "openapi-fetch";
import type { paths } from "./types";
import { env } from "@/lib/env";

let getAccessToken: () => Promise<string | undefined> = async () => undefined;
let getActiveCondoId: () => string | undefined = () => undefined;

export function configureApiAuth(opts: {
  getAccessToken: () => Promise<string | undefined>;
  getActiveCondoId: () => string | undefined;
}) {
  getAccessToken = opts.getAccessToken;
  getActiveCondoId = opts.getActiveCondoId;
}

export const api = createClient<paths>({
  baseUrl: env.CORE_API_URL,
});

api.use({
  async onRequest({ request }) {
    const token = await getAccessToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    const condoId = getActiveCondoId();
    if (condoId) request.headers.set("X-Condo-ID", condoId);
    return request;
  },
});
```

- [ ] **Step 7.5: `.env.example`**

Create `dashboard/.env.example`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_CORE_API_URL=https://core-production-c748.up.railway.app
```

- [ ] **Step 7.6: Smoke build**

Run:

```bash
npm run build
```

Expected: build pode falhar por falta de `.env.local`. Para testar:

```bash
cp .env.example .env.local
# preencher valores reais ou placeholders válidos do Supabase staging
npm run build
```

- [ ] **Step 7.7: Commit**

```bash
git add scripts/sync-swagger.sh src/api/openapi.json src/api/types.ts src/api/client.ts src/lib/env.ts .env.example
git commit -m "feat(api): add sync-swagger script + openapi-fetch client + env loader"
```

---

## Task 8 — Supabase singleton

**Files:**

- Create: `src/lib/supabase.ts`

---

- [ ] **Step 8.1: Criar singleton**

Create `src/lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

- [ ] **Step 8.2: Wire no client da API (configureApiAuth)**

Edit `src/main.tsx` (será reescrito no Task 9; por ora, adicionar wiring básico):

Não editar agora — o wiring vai pra `app/providers.tsx` no Task 9 Step 9.4.

- [ ] **Step 8.3: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat(lib): add Supabase client singleton"
```

---

## Task 9 — Router + providers + bootstrap

**Files:**

- Create: `src/app/routes/__root.tsx`, `src/app/routes/index.tsx`, `src/app/router.tsx`, `src/app/providers.tsx`
- Modify: `src/main.tsx`

---

- [ ] **Step 9.1: Rota raiz**

Create `src/app/routes/__root.tsx`:

```tsx
import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div style={{ minHeight: "100%" }}>
      <Outlet />
    </div>
  );
}
```

- [ ] **Step 9.2: Rota index placeholder**

Create `src/app/routes/index.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/ui/Button/Button";
import { useThemeStore } from "@/stores/theme";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  const { mode, setMode } = useThemeStore();
  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <h1>Zivy dashboard scaffold</h1>
      <p>Tema atual: {mode}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <Button onClick={() => setMode("light")} variant="secondary">
          Light
        </Button>
        <Button onClick={() => setMode("dark")} variant="secondary">
          Dark
        </Button>
        <Button onClick={() => setMode("system")} variant="ghost">
          System
        </Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 9.3: Router instance**

Create `src/app/router.tsx`:

```tsx
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
```

- [ ] **Step 9.4: Providers (Query + theme init + auth wiring)**

Create `src/app/providers.tsx`:

```tsx
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initTheme } from "@/stores/theme";
import { configureApiAuth } from "@/api/client";
import { supabase } from "@/lib/supabase";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    initTheme();
    configureApiAuth({
      getAccessToken: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token;
      },
      getActiveCondoId: () => {
        // Placeholder: será conectado ao store de condo no Plano 3.
        return undefined;
      },
    });
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 9.5: Reescrever `src/main.tsx`**

Replace `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "@/app/router";
import { Providers } from "@/app/providers";
import "@/styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
```

- [ ] **Step 9.6: Build full**

Run:

```bash
npm run build
```

Expected: build OK. O TanStack Router plugin gera `src/app/routeTree.gen.ts` automaticamente; `dist/` é produzido. Se falhar `Cannot find module routeTree.gen`, rodar `npm run dev` brevemente (gera o tree) e depois `npm run build`.

- [ ] **Step 9.7: Smoke `npm run dev`**

Run:

```bash
npm run dev
```

Abrir `http://localhost:5173`. Esperado: heading "Zivy dashboard scaffold", botões trocando tema (data-theme em `<html>`), background mudando entre claro/escuro.

Parar com `Ctrl+C`.

- [ ] **Step 9.8: Commit**

```bash
git add src/app/ src/main.tsx
git commit -m "feat(app): wire TanStack Router + Query + theme + Supabase auth bridge"
```

---

## Task 10 — Storybook

**Files:**

- Create: `dashboard/.storybook/main.ts`, `dashboard/.storybook/preview.tsx`

---

- [ ] **Step 10.1: `.storybook/main.ts`**

Create `dashboard/.storybook/main.ts`:

```ts
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-themes"],
  framework: { name: "@storybook/react-vite", options: {} },
};

export default config;
```

- [ ] **Step 10.2: `.storybook/preview.tsx`**

Create `dashboard/.storybook/preview.tsx`:

```tsx
import type { Preview } from "@storybook/react";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import "../src/styles/global.css";

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    controls: { expanded: true },
  },
  decorators: [
    withThemeByDataAttribute({
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
      attributeName: "data-theme",
      parentSelector: "html",
    }),
  ],
};

export default preview;
```

- [ ] **Step 10.3: Smoke storybook**

Run:

```bash
npm run storybook
```

Abrir `http://localhost:6006`. Esperado: árvore "UI > Button" com variantes Primary/Secondary/Ghost/Danger/Disabled/Sizes; toggle de tema na toolbar funcionando.

Parar com `Ctrl+C`.

- [ ] **Step 10.4: Commit**

```bash
git add .storybook/
git commit -m "feat(storybook): add config with theme decorator"
```

---

## Task 11 — PWA assets + manifest

**Files:**

- Create: `dashboard/public/favicon.svg`, `dashboard/public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`

---

> **Nota:** os ícones reais virão da identidade. Aqui geramos placeholders em verde brand para destravar o build do PWA. Substituir antes de ir a produção.

- [ ] **Step 11.1: Favicon SVG placeholder**

Create `dashboard/public/favicon.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#2F5D50"/>
  <text x="32" y="42" font-family="IBM Plex Sans, sans-serif" font-size="32" font-weight="700" fill="#FFFFFF" text-anchor="middle">Z</text>
</svg>
```

- [ ] **Step 11.2: PNG placeholders via ImageMagick**

Run (requer `imagemagick` ou `magick`/`convert`):

```bash
for size in 192 512; do
  magick -background "#2F5D50" -fill "#FFFFFF" -font "DejaVu-Sans-Bold" -size ${size}x${size} -gravity center label:Z public/icons/icon-${size}.png
done
magick -background "#2F5D50" -fill "#FFFFFF" -font "DejaVu-Sans-Bold" -size 512x512 -gravity center label:Z public/icons/icon-maskable-512.png
```

> Se não tiver `magick` instalado: criar 3 PNGs verdes 192/512/512 manualmente com qualquer ferramenta. Apenas placeholder até a arte real chegar.

- [ ] **Step 11.3: Build com PWA**

Run: `npm run build`
Expected: `dist/manifest.webmanifest` gerado, `dist/sw.js`, `dist/workbox-*.js`. Sem warning de manifest inválido.

- [ ] **Step 11.4: Commit**

```bash
git add public/
git commit -m "feat(pwa): add favicon and placeholder icons for PWA manifest"
```

---

## Task 12 — CI GitHub Actions

**Files:**

- Create: `.github/workflows/ci.yml`

---

- [ ] **Step 12.1: Workflow CI**

Create `dashboard/.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  qa:
    name: Typecheck + Lint + Test + Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm run test

      - name: Build
        env:
          VITE_SUPABASE_URL: https://placeholder.supabase.co
          VITE_SUPABASE_ANON_KEY: placeholder
          VITE_CORE_API_URL: https://core-production-c748.up.railway.app
        run: npm run build

  swagger-drift:
    name: Swagger drift check
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci
      - name: Sync swagger from staging
        env:
          CORE_SWAGGER_URL: https://core-production-c748.up.railway.app/swagger/doc.json
        run: npm run sync:swagger
      - name: Diff
        run: |
          if ! git diff --quiet src/api/openapi.json src/api/types.ts; then
            echo "::warning::Swagger drift detected vs staging — rodar 'npm run sync:swagger' localmente"
            git diff --stat src/api/
            exit 0
          fi
```

> **Por que `continue-on-error` no swagger-drift:** durante desenvolvimento ativo do Core, divergências são esperadas. O job dá warning mas não bloqueia merge. Quando o painel for promovido a produção, remover `continue-on-error`.

- [ ] **Step 12.2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow (typecheck/lint/test/build + swagger drift)"
```

---

## Task 13 — Deploy Vercel

**Files:**

- Create: `dashboard/vercel.json`

---

- [ ] **Step 13.1: `vercel.json` com SPA rewrites**

Create `dashboard/vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

- [ ] **Step 13.2: Instalar Vercel CLI**

```bash
npm install -g vercel
```

- [ ] **Step 13.3: Login Vercel**

Pedir ao usuário (interativo, abre browser):

```
! vercel login
```

- [ ] **Step 13.4: Linkar projeto ao repo**

```bash
cd /home/adams/Documentos/Projetos/ZivyApp/dashboard
vercel link --yes --project zivy-dashboard
```

Quando perguntar org, escolher a conta do usuário. Quando perguntar projeto, criar novo `zivy-dashboard`.

- [ ] **Step 13.5: Adicionar env vars (preview + production)**

Cada env var precisa ser adicionada por target:

```bash
vercel env add VITE_SUPABASE_URL preview
# colar a URL do Supabase staging quando solicitado
vercel env add VITE_SUPABASE_URL production
# colar a URL do Supabase prod

vercel env add VITE_SUPABASE_ANON_KEY preview
vercel env add VITE_SUPABASE_ANON_KEY production

vercel env add VITE_CORE_API_URL preview
# valor: https://core-production-c748.up.railway.app
vercel env add VITE_CORE_API_URL production
# valor: <URL do Railway prod — confirmar com user>
```

> Se preferir UI, fazer pelo dashboard: **Vercel project → Settings → Environment Variables**.

- [ ] **Step 13.6: Deploy preview manual de smoke**

```bash
vercel --confirm
```

Expected: URL preview retornada (ex: `https://zivy-dashboard-xxxx.vercel.app`). Acessar — heading "Zivy dashboard scaffold" deve aparecer e os botões de tema funcionar.

- [ ] **Step 13.7: Commit**

```bash
git add vercel.json
git commit -m "chore(deploy): add Vercel config with SPA rewrites and asset cache"
```

---

## Task 14 — README final + verificação consolidada

**Files:**

- Modify: `dashboard/README.md`

---

- [ ] **Step 14.1: Ampliar README**

Replace `dashboard/README.md`:

````markdown
# Zivy Dashboard

Painel web do Zivy (síndico + zelador). SPA estática consumindo o [Core](https://github.com/ZivyApp/core) via REST e Supabase para auth/realtime.

## Stack

Vite 5 · React 18 · TypeScript strict · TanStack Router/Query · Zustand · CSS Modules + tokens · Radix · Supabase · Vitest · Storybook · Vercel.

## Setup local

```bash
npm install
cp .env.example .env.local      # preencher VITE_SUPABASE_* e VITE_CORE_API_URL
npm run sync:swagger             # baixa swagger.json do Core staging
npm run dev                      # http://localhost:5173
```
````

## Comandos

| Comando                | O que faz                                          |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Vite dev server                                    |
| `npm run typecheck`    | `tsc --noEmit`                                     |
| `npm run lint`         | ESLint + Stylelint                                 |
| `npm run test`         | Vitest                                             |
| `npm run build`        | build de produção                                  |
| `npm run preview`      | serve build local                                  |
| `npm run storybook`    | Storybook em :6006                                 |
| `npm run sync:swagger` | baixa swagger.json do Core e regenera tipos        |
| `npm run gen:api`      | regenera `src/api/types.ts` a partir do JSON local |

## Estrutura

Veja `core/docs/superpowers/specs/2026-04-23-zivy-frontend-stack-design.md` (§3) para o mapa completo de pastas.

## Ambientes

| Ambiente | URL Core                                      | Branch                         |
| -------- | --------------------------------------------- | ------------------------------ |
| Local    | `http://localhost:8080`                       | `feature/*`                    |
| Staging  | `https://core-production-c748.up.railway.app` | `main` (Vercel preview por PR) |
| Produção | (a definir)                                   | `main` (Vercel production)     |

## CI/CD

- CI em PR e push em `main`: typecheck + lint + test + build + swagger drift check.
- Vercel: preview por PR + production em `main`.

````

- [ ] **Step 14.2: Verificação consolidada**

Run em sequência:
```bash
npm run typecheck && npm run lint && npm run test && npm run build
````

Expected: tudo verde.

- [ ] **Step 14.3: Commit final**

```bash
git add README.md
git commit -m "docs: complete dashboard README with setup, commands, environments"
```

- [ ] **Step 14.4: Push e abrir PR**

```bash
git push -u origin feature/scaffold
gh pr create --base main --title "feat: scaffold dashboard project" --body "$(cat <<'EOF'
## Summary
Scaffold completo do painel web Zivy conforme spec frontend stack design + identity REVISADA.

- Vite 5 + React 18 + TypeScript strict
- Design tokens da identity REVISADA em src/design-tokens/
- Theme switching (light/dark/system) via Zustand persist
- Componente ui/Button (prova do pattern: tsx + module.css + test + story)
- API client: openapi-fetch + sync-swagger.sh + tipos gerados
- Supabase client singleton + bridge no auth header da API
- TanStack Router + Query providers
- Storybook local com decorator de tema
- PWA configurado (manifest + service worker)
- CI GitHub Actions: typecheck + lint + test + build + swagger drift
- Vercel: vercel.json + projeto linkado + env vars

## Out of scope
Telas (login, inbox, ticket detail, approvals), realtime client, switcher de condo, layout shell completo, catálogo completo de ui/* — ficam para Planos 3+.

## Test plan
- [x] npm run typecheck
- [x] npm run lint
- [x] npm run test
- [x] npm run build
- [x] npm run dev — heading e theme toggle funcionando
- [x] npm run storybook — Button com 6 stories
- [x] vercel preview deploy retorna URL acessível
EOF
)"
```

---

## Self-Review

**Spec coverage (frontend stack design):**

- §2 Stack consolidada → Tasks 1, 2, 7, 9, 10 ✅
- §3 Estrutura de pastas → Task 3 + materializada ao longo do plano ✅
- §4 Design tokens e tema → Tasks 4, 5 ✅
- §5 Integração com Core → Task 7 ✅
- §6 Auth e multi-tenancy → Task 8 + bridge no Task 9 ✅ (UI de login fica no Plano 3)
- §7 Realtime → fora de escopo deste plano (helper preparatório fica no Plano 3)
- §8 Roteamento e telas MVP → fora de escopo (apenas root + index placeholder no Task 9)
- §9.1 PWA → Task 11 ✅
- §9.2 Testes → Task 5/6 + setup no Task 1 ✅
- §9.3 Tooling → Task 2 ✅
- §9.4 CI → Task 12 ✅
- §9.5 Deploy Vercel → Task 13 ✅
- §9.6 Observabilidade → backlog pós-MVP (Vercel Analytics ativada por default no projeto Vercel)
- §9.7 Variáveis de ambiente → Task 7 (.env.example) + Task 13 (Vercel) ✅
- §10 Pré-requisitos do Core → fora de escopo (cumpridos em Plan 1)
- §11 Fora de escopo → respeitado (sem boletos, sem CRUDs admin, sem dashboard de stats)

**Spec coverage (identity REVISADA):**

- §2 Paleta → Task 4.1 (todos os tokens com Light + Dark) ✅
- §3 Tipografia → Task 4.2 + global.css ✅
- §4 Componentes → Task 6 (Button como prova) — restante fica para próximos planos
- §5 Responsividade → Task 4.7 (breakpoints) ✅
- §6 Light + Dark → Task 5 ✅
- §9 Estrutura de tokens → Task 4 inteiro ✅

**Placeholder scan:** sem TBDs. Códigos completos em todos os steps. Ícones PWA são placeholders explícitos com plano de substituição.

**Type consistency:**

- `ThemeMode = "light" | "dark" | "system"` consistente entre store, applyTheme, route index.
- `Variant`/`Size` do Button consistentes entre tipo, classes CSS e stories.
- `configureApiAuth` com mesma assinatura entre client.ts e providers.tsx.

**Gaps conhecidos:**

- Step 7.2 assume `/swagger/doc.json` exposto pelo Core — se path for outro, ajustar `CORE_SWAGGER_URL`.
- Step 11.2 requer ImageMagick instalado — fallback é criar PNGs manualmente.
- Step 13.4 cria projeto Vercel novo. Se já existir, usar `vercel link --yes` sem `--project`.
- Vars `VITE_SUPABASE_*` no CI (Step 12.1) usam placeholders — build não precisa deles para passar, mas o env loader (`src/lib/env.ts`) lança em runtime se ausentes. Build estático compila sem rodar o loader.

---

## Próximo plano

Após merge deste PR:

- **Plano 3 (login + shell + condo switcher)** — telas de auth, layout principal com header/sidebar, switcher consumindo `/condos/me`, store de condo ativo, guards de role.
- **Plano 4 (Inbox + Ticket Detail)** — tabela responsiva, filtros, realtime via Supabase, detalhe com timeline `ticket_events`.
- **Plano 5 (Approval Queue + Settings)** — fila de aprovação com `PATCH /residents/{id}/approve|reject`, settings de tema/perfil.
- **Plano 6 (Catálogo `ui/*` completo)** — Input, Modal, Toast, DropdownMenu, etc., todos com stories e testes.
