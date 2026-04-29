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

## Variáveis de ambiente

Copie `.env.example` → `.env.local` e preencha.

## Documentação

Specs e plano em `core/docs/superpowers/`.
