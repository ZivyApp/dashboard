# Plan 5 — Redesign do shell + Activity Feed unificado

**Data:** 2026-05-14
**Status:** Spec aprovada, pronto para `writing-plans`
**Origem:** prototipagem visual no Claude Design (screenshot anexo na conversa de brainstorming)

## Contexto

Plan 2 entregou um shell mínimo (header + sidebar simples) e Plan 4 entregou a Inbox per-condo consumindo `/tickets` filtrado por `status ∈ {open, in_progress}`. O usuário prototipou um redesign que muda mais do que o visual:

- Sidebar agrupada (ESCOPO / OPERAÇÃO / ESTRUTURA) com contadores.
- Topbar global com switcher, busca, role badge.
- Escopo "Todos os condomínios" como modo default (cross-condo).
- Inbox vira um **feed de eventos unificado** (tickets, aprovações, comentários, mudanças de status) com estado lido/não lido por usuário e tabs.

O Plan 5 implementa esse redesign mantendo o Plan 4 (Inbox per-condo simples) como fallback enquanto o backend do feed não existe.

## Decisões

| Tópico                            | Decisão                                                                                      | Por quê                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Conteúdo do feed                  | Eventos unificados (`ticket_*`, `approval_pending`)                                          | Match com o protótipo; permite construir UX coerente em vez de N listas separadas. |
| Backend do feed                   | Mock-first: dashboard contra `LocalActivityRepository`; PR no Core em paralelo               | Frontend não fica bloqueado; quando Core mergeia, troca o adapter via flag.        |
| Roteamento                        | Coexistência: `/inbox`, `/tickets`, `/approvals` (cross-condo) + `/c/$condoId/*` (per-condo) | URL declara o escopo; guards de role já existentes per-condo continuam valendo.    |
| Read state                        | Server-side, tabela `activity_reads` no Core                                                 | Sincroniza entre dispositivos. UX de "não lidos" perde valor sem isso.             |
| Estrutura (Blocos/Unidades/Áreas) | Apenas placeholders (sidebar visível, conteúdo "Em breve")                                   | Replica o protótipo sem custo de implementar 3 CRUDs.                              |
| Busca global na topbar            | Apenas visual (input renderiza, foco mostra toast "Em breve")                                | Busca cross-entity merece spec dedicada.                                           |
| Click em item do feed             | Abre detalhe do recurso (modal/rota). Não marca lido.                                        | UX explícita; marcar lido é ação separada (hover ✓ ou "marcar tudo").              |
| Plan 4.3 (TicketDetailModal)      | Segue normal                                                                                 | Modal funciona em qualquer shell; sem retrabalho relevante.                        |

## Arquitetura

### Roteamento

```
/_app
├── /index                   (existente — landing/redirect)
├── /inbox                   (NOVO — feed cross-condo)
├── /tickets                 (NOVO — listagem cross-condo, placeholder por enquanto)
├── /approvals               (NOVO — placeholder)
└── /c/$condoId
    ├── /inbox               (per-condo, existe — passa a renderizar ActivityFeed também)
    ├── /tickets             (existe)
    ├── /approvals           (existe)
    ├── /settings            (existe)
    └── /structure
        ├── /blocks          (NOVO — placeholder)
        ├── /units           (NOVO — placeholder)
        └── /common-areas    (NOVO — placeholder)
```

### Scope

O escopo é derivado da URL, não armazenado:

```ts
// src/features/scope/useScope.ts
type Scope = { kind: "all" } | { kind: "condo"; condoId: string };

function useScope(): Scope {
  const match = useMatch({ from: "/_app/c/$condoId", shouldThrow: false });
  return match ? { kind: "condo", condoId: match.params.condoId } : { kind: "all" };
}
```

Não há `scopeStore` Zustand — o `CondoSwitcher` chama `navigate()` e a URL é a única fonte de verdade. Componentes consomem `useScope()`.

### ActivityRepository (mock-first)

```ts
// src/features/activity/repository/types.ts
export type ActivityKind =
  | "ticket_created"
  | "ticket_urgent"
  | "ticket_commented"
  | "ticket_status_changed"
  | "approval_pending";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  condoId: string;
  condoName: string;
  title: string;
  subtitle?: string;
  resourceRef:
    | { type: "ticket"; ticketId: string }
    | { type: "resident_approval"; residentId: string };
  priority?: "low" | "medium" | "high";
  occurredAt: string; // ISO 8601
  readAt: string | null; // null = não lido
}

export type ActivityTab = "all" | "unread" | "approvals";

export interface ActivityRepository {
  list(opts: {
    scope?: Scope; // omitido = "all"
    tab?: ActivityTab; // default "all"
    cursor?: string;
    limit?: number;
  }): Promise<{ items: ActivityEvent[]; nextCursor?: string; counts: Record<ActivityTab, number> }>;
  markRead(id: string): Promise<void>;
  markAllRead(scope?: Scope): Promise<void>;
}
```

Implementações:

- `LocalActivityRepository` (`src/features/activity/repository/local.ts`): ~12 fixtures determinísticas em memória cobrindo todos os `kind`; estado `readAt` persistido em `localStorage` (chave por evento). Sem efeitos colaterais entre testes (factory cria instância fresca).
- `HttpActivityRepository` (`src/features/activity/repository/http.ts`): consome o endpoint proposto no Core (ver seção "Contrato com Core"). Implementado em Slice 5.4 e gated pela flag.

Seleção via `lib/env.ts`:

```ts
VITE_ACTIVITY_REPOSITORY = local | http; // default "local"
```

`RepositoryProvider` injeta a implementação selecionada no `QueryClient` via React Context (`useActivityRepository()`).

## Componentes (UI)

### Shell

```
src/ui/AppShell/
├── AppShell.tsx               # reescrito — composição Topbar + Sidebar + <main>
├── Topbar/
│   ├── Topbar.tsx             # logo + CondoSwitcher + SearchBox + RoleBadge + SettingsIcon
│   ├── Topbar.module.css
│   ├── SearchBox.tsx          # input visual; foco dispara toast "Em breve"
│   └── SearchBox.module.css
├── Sidebar/
│   ├── Sidebar.tsx            # composição de grupos
│   ├── Sidebar.module.css
│   ├── SidebarHeader.tsx      # bloco "ESCOPO" — título + metadata do scope
│   ├── SidebarGroup.tsx       # label uppercase + lista de items
│   ├── SidebarItem.tsx        # ícone + label + badge opcional (contador)
│   └── SidebarFooter.tsx      # "v1.10 · develop"
├── RoleBadge.tsx              # "Administradora" / "Síndico" / "Zelador"
└── EmptyState.tsx             # (existente, reaproveita)
```

`CondoSwitcher` (atual em `src/features/condo/`) é adaptado: lista inclui item "Todos os condomínios" no topo; selecionar dispara `navigate()` para a rota equivalente no escopo destino (ex.: estou em `/c/X/inbox`, troco para "Todos" → vai para `/inbox`).

### Activity Feed

```
src/features/activity/
├── repository/
│   ├── types.ts
│   ├── local.ts
│   ├── http.ts                # esqueleto até Slice 5.4
│   ├── fixtures.ts            # dados determinísticos para local + testes
│   └── index.ts               # factory por env
├── RepositoryProvider.tsx     # Context API
├── useActivityRepository.ts   # hook do context
├── useActivityFeed.ts         # useQuery: list por (scope, tab, cursor)
├── useMarkRead.ts             # useMutation: markRead / markAllRead
├── ActivityFeed.tsx           # tabs + lista + paginação + "marcar tudo"
├── ActivityFeed.module.css
├── ActivityFeedTabs.tsx
├── ActivityItem.tsx
├── ActivityItem.module.css
├── activityIcon.ts            # kind → ícone (lucide-react)
└── activityPalette.ts         # kind/priority → cor da barra lateral
```

### Anatomia do item

- Barra lateral colorida (4px): cor por `priority` (urgente → red; high → orange; medium → blue; low → gray) ou por `kind` se `priority` ausente (`approval_pending` → blue).
- Ícone por `kind` (lucide-react).
- Título peso `medium` quando não lido, `regular` quando lido.
- Subtítulo opcional (geralmente `condoName` + contexto).
- Timestamp relativo à direita (reaproveita `formatRelTime` do Plan 4.1).
- Hover revela botão "✓" → `markRead(id)`. Não navega.
- Click no card (fora do botão) → `navigate(resourceRef)`. Não marca lido.

### Tabs

`ActivityFeedTabs` usa `searchParams` (`?tab=all|unread|approvals`) — reload preserva estado. Tabs têm badge com `counts[tab]` do payload.

### Read state UX

- "Marcar tudo como lido" no header da inbox (botão secundário). Dispara `markAllRead(scope)`.
- Hover ✓ por item. Sem optimistic update no MVP: invalidação simples do React Query.
- Badge "X não lidos" no `SidebarItem` "Inbox" vem de `useActivityFeed({ tab: "unread", limit: 0 })` reaproveitando contador.

## Contrato proposto para o Core

Vira issue separada no repo `core`. Frontend já implementa contra essa expectativa.

```
GET /activity
  ?condo_id=<uuid>             # opcional; ausente = união dos condos do user
  &tab=all|unread|approvals    # opcional, default=all
  &cursor=<opaque>             # opcional para paginação
  &limit=20                    # opcional, default=20, max=50

Response 200:
{
  "items": [ActivityEvent...],
  "next_cursor": "<opaque>" | null,
  "counts": { "all": N, "unread": M, "approvals": K }
}

POST /activity/{id}/read       → 204 (idempotente)

POST /activity/read-all
  body: { condo_id?: string } # null = todos os condos
                               → 204
```

Tabelas novas (proposta):

```sql
-- activity_events: tabela materializada a partir de domain events
-- ou view sobre tickets/comments/residents pendentes
-- Campos: id, kind, condo_id, title, subtitle, resource_type, resource_id,
--         priority, occurred_at, indexed on (condo_id, occurred_at desc)

-- activity_reads: (user_id, event_id, read_at) — PK composta
-- Lookup join: events LEFT JOIN reads ON (user_id, event_id)
```

## Slicing

Quatro PRs, todos contra `develop`.

### Slice 5.1 — Shell visual novo

- Reescreve `AppShell`: `Topbar` substitui o `Header` atual; `Sidebar` ganha grupos.
- Componentes novos do shell (`Topbar`, `SearchBox`, `Sidebar*`, `RoleBadge`).
- `CondoSwitcher` ganha item "Todos" + navega para rota equivalente.
- `useScope()` hook derivado da URL.
- Rotas novas criadas como `EmptyState` "Em breve":
  - `/_app/inbox.tsx`, `/_app/tickets.tsx`, `/_app/approvals.tsx`
  - `/_app/c/$condoId/structure/{blocks,units,common-areas}.tsx`
- Sidebar mostra "Estrutura" apenas quando `scope.kind === "condo"`.
- Storybook das peças novas.
- Inbox 4.2 (e 4.3 quando mergeada) continua funcionando em `/c/$id/inbox` — sem regressão.

### Slice 5.2 — Activity adapter + ActivityFeed

- `ActivityRepository` interface + `LocalActivityRepository` com fixtures.
- `RepositoryProvider` em `app/providers.tsx`.
- `useActivityFeed`, `useMarkRead`.
- `ActivityFeed`, `ActivityFeedTabs`, `ActivityItem` + paleta/ícones.
- `/inbox` e `/c/$condoId/inbox` passam a renderizar `ActivityFeed` com `scope` derivado. Header da inbox passa a mostrar "N não lidos" (em vez de "N chamados ativos" do Plan 4.2).
- Click em item:
  - `ticket` → abre `TicketDetailModal` (rota `/inbox/$ticketId` do 4.3) quando no escopo per-condo; em `/inbox` cross-condo, navega para `/c/$id/inbox/$ticketId`.
  - `resident_approval` → navega para `/c/$id/approvals?highlight=$residentId`.
- Sidebar item "Inbox" ganha badge de "não lidos".
- Testes:
  - `LocalActivityRepository`: filtro por tab, filtro por scope, `markRead` idempotente, `markAllRead` respeitando scope.
  - `ActivityFeed`: tabs alternam, click navega (mock router), botão ✓ marca como lido, "marcar tudo" limpa badge.

### Slice 5.3 — Role guards + ajustes

- `useRoleGuard` aplicado nas novas rotas:
  - `/c/$id/structure/*`: somente `admin` e `sindico`.
  - `/approvals` (cross e per-condo): somente `admin` e `sindico`.
- Sidebar esconde grupos/itens conforme role.
- Topbar `RoleBadge` reflete o role do usuário no scope atual. Em "all", usa `roleHierarchy` (Plan 3.3) e exibe o role de maior nível entre todos os condos do usuário (admin > sindico > zelador).

### Slice 5.4 — HttpActivityRepository (gated)

- Implementa `http.ts` contra o contrato proposto.
- Flag `VITE_ACTIVITY_REPOSITORY=http` ativa.
- Plano contém step explícito "aguardar Core mergear endpoint" antes de virar a flag em produção.
- Default continua `local` até validação manual em staging com Core real.

## Estratégia de testes

| Camada                                             | Abordagem                                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `LocalActivityRepository`                          | Testes unitários completos. Determinístico via fixtures injetáveis.                               |
| `ActivityFeed`, `ActivityFeedTabs`, `ActivityItem` | Integrados com `LocalActivityRepository` real (não mock). Cobertura de tabs, navigate, mark read. |
| `Topbar`, `Sidebar*`                               | Presentational. Renderização, callbacks, condições por role/scope.                                |
| `useScope`                                         | Unit. Match contra rotas conhecidas.                                                              |
| `HttpActivityRepository`                           | `vi.mock("@/api/client")` (padrão estabelecido no Plan 4 para módulos env-bound).                 |
| Smoke manual                                       | Comparação visual com screenshot prototipado antes de cada PR.                                    |

## Padrões reaproveitados (CLAUDE.md)

- Inicialização síncrona de tema continua valendo (não muda).
- Tokens semânticos (Plan 4.1) reaproveitados; se faltar cor para `kind`/`priority` específico, adiciona em `design-tokens/`.
- CSS Modules + `Record<Variant, string>` com fallback `?? ""`.
- Botões `type="button"`.
- `safeStorage()` para qualquer escrita em `localStorage` (read state no adapter local).
- Type guards no boundary `API → domain` (vale para `HttpActivityRepository`).
- `vi.mock` + `vi.hoisted` para módulos env-bound.

## Fora de escopo (vai para backlog)

- Busca global funcional cross-entity (input já existe visualmente).
- Telas reais de Blocos, Unidades, Áreas Comuns (placeholders no Plan 5; CRUDs em Plan 6+).
- Realtime via Supabase para activity (polling 30s suficiente no MVP).
- Notificações push / Telegram (já no backlog desde Plan 3).
- Optimistic updates em `markRead` / `markAllRead`.

## Riscos

| Risco                                                                 | Mitigação                                                                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Contrato proposto para `/activity` não bate com o que o Core entrega  | Slice 5.4 é separado; adapter HTTP isola o ajuste. `Local` continua funcionando até alinhamento.                         |
| "Não lidos" sem read state ainda no Core                              | Slices 5.1–5.3 funcionam 100% com adapter local; nenhum bloqueio.                                                        |
| Sidebar "Estrutura" com 3 placeholders virando pegadinha para usuário | Cada placeholder mostra `EmptyState` explícito ("Em breve no Plan 6"); link visível na sidebar evita "perdi a feature?". |
| Mudança de `CondoSwitcher` quebra navegação per-condo do Plan 3.3     | Testes de regressão; manter `CondoSwitcher.test.tsx` verde + adicionar caso "Todos".                                     |

## Cronologia esperada (não é compromisso)

- Spec aprovada → `writing-plans` → plano detalhado (Plan 5.0).
- Slice 5.1 (shell): ~1 dia.
- Slice 5.2 (feed + adapter local): ~1.5 dia.
- Slice 5.3 (guards): ~0.5 dia.
- Slice 5.4 (HTTP adapter): ~0.5 dia + dependência do Core.
