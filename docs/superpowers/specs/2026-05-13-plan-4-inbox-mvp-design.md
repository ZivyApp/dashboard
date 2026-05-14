# Plan 4 — Inbox MVP — Design

**Data:** 2026-05-13
**Status:** Spec aprovada, pronta para implementação plan
**Base:** `develop` (Plan 3 mergeado em PR #7)

---

## Contexto

Plan 3 entregou auth, AppShell e condo switcher. As rotas `/c/$condoId/inbox` e `/c/$condoId/tickets` existem como placeholders. Plan 4 substitui o placeholder de `/inbox` pela primeira tela de trabalho real do dashboard: a fila de tickets ativos do condo, com detalhe read-only acessível por URL.

Referência visual: bundle do Claude Design em `/tmp/zivy-design/zivy/` (apenas referência — escopo segue este spec).

---

## Escopo

### Inclui

- Inbox = fila de tickets com `status in (open, in_progress)` do condo ativo.
- Filtros: busca livre client-side (título, protocolo, morador), segmented de status (`Tudo / Abertos / Em andamento`), dropdown de prioridade.
- Ordenação fixa: prioridade desc, depois `updated_at` desc.
- Polling de 30s + `refetchOnWindowFocus` para "realtime preview".
- Rota dedicada `/c/$condoId/inbox/$ticketId` em apresentação modal sobre a lista.
- Detalhe read-only: protocolo, título, status, prioridade, condo, morador, localização, datas, descrição. Placeholder na base avisando que ações chegam no Plan 5.
- Responsivo: tabela em desktop, lista de cards em mobile (< 768px). Modal vira tela cheia em mobile.
- Tokens semânticos novos para status/prioridade.
- Componentes reutilizáveis em `src/ui/`: `StatusBadge`, `PriorityChip`, `Modal`.

### Não inclui (out of scope)

- `/c/$condoId/tickets` (arquivo completo com kanban/cards/table) — Plan futuro.
- Ações na modal (mudar status, atribuir, comentar) — Plan 5.
- Timeline de eventos do ticket — Plan 5.
- Feed de notificações (inbox-as-notification-center do design Claude) — Plan futuro.
- Approvals (já no roadmap como Plan 6).
- Export CSV, botão "Novo chamado".
- Paginação server-side (defensive warn no client; Plan futuro se necessário).
- Realtime via Supabase channels (Plan futuro se polling não bastar).

---

## Decisões de design

| Decisão                 | Escolha                                                                          | Motivo                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Escopo de detalhe       | Read-only                                                                        | Plan curto, ações ficam para Plan 5 que cuida disso de ponta a ponta.                                     |
| Inbox vs Tickets        | Inbox = fila de trabalho (`open`+`in_progress`); Tickets = arquivo (Plan futuro) | Cobre o padrão "o que tenho pra fazer hoje" vs "histórico".                                               |
| Realtime                | Polling 30s + refetch on focus                                                   | Zero infra nova, latência aceitável para MVP. Migrar para Supabase Realtime é uma fatia isolada futura.   |
| Apresentação do detalhe | Rota dedicada `/inbox/$ticketId` com modal route                                 | URL linkável e refreshable; visual de modal do design; mobile cai em tela cheia.                          |
| Filtros                 | Busca + segmented status + dropdown priority                                     | Bate com o design, custo baixo. Busca client-side híbrida (backend só filtra protocolo via `?protocol=`). |
| Paginação               | Aceitar como está + `console.warn` se > 200                                      | Realista para condos de hoje; Plan dedicado quando algum cliente bater o limite.                          |
| Mobile                  | Lista de cards (< 768px) + tabela (≥ 768px)                                      | AppShell do Plan 3 já é responsivo; mobile é cidadão de primeira.                                         |

---

## Arquitetura

### Rotas

```
src/app/routes/_app/c/$condoId/
  inbox.tsx              ← layout pai: header + filtros + lista. <Outlet/> para a modal.
  inbox/
    $ticketId.tsx        ← rota filha modal sobre a lista.
```

`/inbox/$ticketId` é uma **modal route** do TanStack Router: a URL muda, o pai não desmonta, a lista permanece visível atrás da overlay. Refresh em `/inbox/TKT-...` carrega lista + abre modal automaticamente. Fechar modal = `navigate({ to: "..", from: Route.fullPath })`.

### Pastas e arquivos

```
src/features/inbox/
  InboxPage.tsx               componente da rota inbox.tsx
  InboxFilters.tsx            search + segmented status + dropdown priority
  InboxList.tsx               decide table vs cards por CSS
  TicketTable.tsx             <table> para desktop
  TicketCards.tsx             lista vertical de cards para mobile
  TicketRow.tsx               linha/card; click → navega para /$ticketId
  TicketDetailModal.tsx       componente da rota $ticketId.tsx
  useInboxTickets.ts          query: 2 calls em paralelo, merge
  useTicket.ts                query: GET /tickets/{id}
  filterTickets.ts            função pura (busca + status + priority)
  filterTickets.test.ts
  *.test.ts(x)                co-localizados

src/ui/
  StatusBadge/                badge para status (open/in_progress/resolved/closed)
  PriorityChip/               chip de prioridade (low/medium/high)
  Modal/                      wrapper sobre Radix Dialog
```

### Data layer

- `useInboxTickets(condoId)` — duas chamadas em paralelo (`GET /tickets?status=open` + `GET /tickets?status=in_progress`), merge em uma lista. Query key: `["tickets", condoId, "active"]`. `refetchInterval: 30_000`, `refetchOnWindowFocus: true`. `console.warn` se resultado > 200.
- `useTicket(ticketId)` — `GET /tickets/{id}`. Query key: `["ticket", ticketId]`. Usado pela modal.
- Filtros e ordenação são client-side via `filterTickets(list, { search, status, priority })` em `useMemo`.

### Componentes

**`InboxPage`**: header (título + contagem), `InboxFilters`, `InboxList`. Filtros vivem em `useState` local. Ordenação fixa (prioridade desc, `updated_at` desc) feita no `useMemo`.

**`InboxFilters`**: search à esquerda (flex 1, ícone lupa), segmented `Tudo (ativos) / Abertos / Em andamento` no meio, dropdown de prioridade à direita. Stack vertical em mobile.

**`InboxList`**: renderiza `TicketTable` (visível ≥ 768px via CSS) e `TicketCards` (visível < 768px). Mesmo dataset, apresentação diferente.

**`TicketTable`** (desktop): colunas Protocolo, Chamado (título + sub: localização/morador), Status, Prioridade, Atualizado. Hover sutil, cursor pointer, click chama navigate.

**`TicketCards`** (mobile): cada card com título grande (truncate 2 linhas), `<protocolo · prioridade>`, `<status badge · há X min>`. Toda a área clicável.

**`TicketDetailModal`** (read-only):

- Header: `protocolo (mono) · condo`, título, badges (status, prioridade), botão fechar.
- Meta: morador, contato, localização (`unit_number` ou `common_area_name`), aberto em (`createdAt`), atualizado em (`relTime(updatedAt)`).
- Descrição (bloco).
- Base: `<EmptyState description="Comentários, atribuição e mudança de status chegam no Plan 5" />`.

**`Modal` (em `src/ui/`)**: wrapper sobre `@radix-ui/react-dialog`. Cuida de foco trap, Esc, click overlay, `aria-labelledby`. Reusável por Plan 5/6.

### Estilo

- Tokens existentes (`src/design-tokens/`). Sem cores cruas (stylelint barra).
- Tokens semânticos novos: `--status-open-bg/fg`, `--status-in-progress-bg/fg`, `--status-resolved-bg/fg`, `--status-closed-bg/fg`, `--priority-low-bg/fg`, `--priority-medium-bg/fg`, `--priority-high-bg/fg`. Adicionar no arquivo de tokens, documentar no PR 4.1.
- Tipografia: IBM Plex Sans para texto, IBM Plex Mono para protocolos e timestamps (já carregados via subset `latin` no Plan 2).
- Densidade da tabela: padding-y 12px, hover sutil, cursor pointer.

### Estados

**Lista:**

| Estado             | UI                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| Loading inicial    | Skeleton de 5 linhas/cards.                                                                            |
| Loading de polling | Barra fina sutil no topo (`isFetching && !isPending`).                                                 |
| Erro               | `EmptyState` + botão "Tentar novamente" (`refetch()`).                                                 |
| Vazio com filtros  | `EmptyState title="Nenhum chamado" description="Ajuste os filtros para ver outros tickets."`           |
| Vazio sem filtros  | `EmptyState title="Tudo em dia" description="Nenhum chamado aberto ou em andamento neste condomínio."` |

**Modal:**

| Estado     | UI                                                                   |
| ---------- | -------------------------------------------------------------------- |
| Loading    | Spinner centralizado dentro da modal.                                |
| Erro 404   | `EmptyState` + botão "Voltar para inbox" (`navigate({ to: ".." })`). |
| Erro outro | Mesmo padrão + "Tentar novamente".                                   |

---

## Testes

| Arquivo                      | O que testa                                                                                                                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filterTickets.test.ts`      | Função pura. Matriz: busca por título/protocolo/morador (case-insensitive), filtro de status, filtro de priority, combinações. Edge: lista vazia, sem filtros = identidade, `"all"` não filtra.                   |
| `useInboxTickets.test.tsx`   | Mock `api.GET`. Dispara 2 calls (`?status=open` + `?status=in_progress`), merge, query key correta, `refetchInterval: 30000`. Edge: uma call falha → erro propaga; ambas vazias → lista vazia. Warn quando > 200. |
| `InboxFilters.test.tsx`      | Render + interações: digitar na busca, click no segmented, select de priority. Default segmented = `"all"`.                                                                                                       |
| `InboxPage.test.tsx`         | Integração curta: mock `useInboxTickets` com 3 tickets, render, tabela com 3 linhas, aplica filtro, lista reduz. Loading → skeleton. Empty sem filtros → "Tudo em dia". Empty com filtros → "Ajuste os filtros".  |
| `TicketDetailModal.test.tsx` | Mock `useTicket`. Header (protocolo, título, badges), meta, descrição, placeholder. Erro 404 → "Voltar para inbox". Esc / click fora chama `onClose`.                                                             |
| `TicketRow.test.tsx`         | Click chama navigate com `to: "./$ticketId"` e param correto.                                                                                                                                                     |

Mocks via `vi.spyOn` + `vi.restoreAllMocks()` em `afterEach` (lição Plan 2). Sem `Object.defineProperty`.

---

## Fatiamento em PRs

Três fatias contra `develop`, ordem obrigatória.

### Slice 4.1 — Foundations

**Escopo:** tokens semânticos novos. Componentes `StatusBadge`, `PriorityChip`, `Modal` em `src/ui/` com stories no Storybook. Hooks `useInboxTickets` e `useTicket` com tests. Função `filterTickets` com tests. **Sem rotas alteradas.**

**Critério de pronto:**

- Storybook mostra cada componente em todas as variantes.
- Tests verdes (`filterTickets`, `useInboxTickets`, `useTicket`).
- `npm run test`, `typecheck`, `lint`, `build` verdes.
- PR contra `develop`, CI verde.

### Slice 4.2 — Inbox list page

**Escopo:** substitui placeholder de `/c/$condoId/inbox` pela `InboxPage` real. Header, `InboxFilters`, `InboxList` (TicketTable desktop + TicketCards mobile), estados loading/error/empty. Click no ticket: `navigate({ to: "./$ticketId" })` — sub-rota ainda não existe (404 isolado, resolvido em 4.3).

**Critério de pronto:**

- Smoke manual em staging com user super_admin e condo com tickets reais: lista carrega, filtros funcionam, polling atualiza após 30s, mobile e desktop OK.
- Empty states corretos (sem tickets / sem matches de filtro).
- Tests de `InboxPage`, `InboxFilters`, `TicketRow` verdes.
- CI verde.

### Slice 4.3 — Ticket detail modal route

**Escopo:** cria `/c/$condoId/inbox/$ticketId` como modal route filha. `TicketDetailModal` read-only (header + meta + descrição + placeholder Plan 5). Acessibilidade: foco trap (Radix Dialog), Esc, click overlay.

**Critério de pronto:**

- Refresh em `/inbox/TKT-...` reabre modal sobre a lista.
- Esc/click overlay/botão X fecha → volta para `/inbox`.
- Mobile: modal em tela cheia.
- Test `TicketDetailModal` verde.
- CI verde.

---

## Critério de pronto do Plan 4

- [ ] 4.1 + 4.2 + 4.3 mergeados em `develop`, preview Vercel verde.
- [ ] Smoke manual no preview com user super admin:
  - [ ] Login → Inbox carrega tickets `open` + `in_progress` do condo ativo.
  - [ ] Segmented filtra. Search por protocolo/título/morador funciona.
  - [ ] Polling de 30s: criar ticket no Core via curl, esperar, lista atualiza sozinha.
  - [ ] Click num ticket → URL muda, modal abre. Refresh mantém modal. Esc fecha. Mobile = tela cheia.
  - [ ] Empty states corretos.
- [ ] CLAUDE.md atualizado com lições de review surgidas.

---

## Riscos e mitigações

| Risco                                                                                 | Mitigação                                                                                                                                                      |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Polling de 30s gera carga indesejada no Core em horários de pico                      | Métrica simples: log de duração da query no client por 1 semana após release. Se virar problema, reduzir frequência ou migrar para realtime.                   |
| Modal route do TanStack Router não funcionar como esperado em refresh                 | Validar cedo em 4.3 com teste manual de refresh em `/inbox/$ticketId`. Fallback: usar parameterless route + zustand para estado da modal (perde URL linkável). |
| Condo com 1000+ tickets ativos quebra a lista                                         | Defensive `console.warn` em 4.1 captura. Quando algum cliente real bater, abrir issue no Core para paginação.                                                  |
| Backend não retorna campo X que a modal precisa                                       | Verificar `TicketResponse` schema antes de 4.1. Se algo faltar, abrir issue no Core (preferir Plan dedicado em vez de bloquear).                               |
| Tokens semânticos colidem com tokens existentes ou ficam inconsistentes com tema dark | Validar em ambos os temas em Storybook antes do PR 4.1. Stylelint protege de cor crua.                                                                         |
