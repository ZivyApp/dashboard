# Zivy Dashboard

Painel web do Zivy (síndico + zelador). SPA estática consumindo o [Core](https://github.com/ZivyApp/core) via REST e Supabase para auth/realtime.

## Stack

Vite 5 · React 19 · TypeScript strict · TanStack Router/Query · Zustand · CSS Modules + tokens · Radix · Supabase · Vitest · Storybook · Vercel.

## Setup local

```bash
npm install
cp .env.example .env.local      # preencher VITE_SUPABASE_* e VITE_CORE_API_URL
npm run sync:swagger             # baixa swagger.json do Core staging
npm run dev                      # http://localhost:5173
```

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

Veja [`CLAUDE.md`](./CLAUDE.md) (§Architecture + §Padrões e convenções) para o mapa de pastas e convenções vigentes. Specs históricas em `docs/superpowers/specs/` registram decisões de cada plan. Gaps de API e proposta de próximos plans em [`docs/roadmap.md`](./docs/roadmap.md).

## Ambientes

| Ambiente | URL Core                                      | Branch                         |
| -------- | --------------------------------------------- | ------------------------------ |
| Local    | `http://localhost:8080`                       | `feature/*`                    |
| Staging  | `https://core-production-c748.up.railway.app` | `main` (Vercel preview por PR) |
| Produção | (a definir)                                   | `main` (Vercel production)     |

## CI/CD

- CI em PR e push em `main`: typecheck + lint + test + build + swagger drift check.
- Vercel: preview por PR + production em `main`.
