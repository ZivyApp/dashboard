# Roadmap — gaps de consumo da API e próximos plans

Análise feita em **2026-07-21**, cruzando `src/api/openapi.json` (swagger do Core) com o consumo real no frontend. Serve como mapa de referência para priorização — a decisão de escopo de cada plan acontece no brainstorm próprio, registrado em `docs/superpowers/plans/`.

## Gap analysis: API do Core vs consumo no dashboard

| Endpoint do Core                                                                                          | Status no dashboard                                                           |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `/blocks`, `/units`, `/common-areas` (CRUD completo)                                                      | ❌ Zero consumo — as 3 rotas em `structure/` são placeholders (`EmptyState`)  |
| `/condos/{id}/invite-tokens`                                                                              | ❌ Não consumido — não existe UI de convite de morador                        |
| `/residents` POST/PATCH/`/status`                                                                         | ⚠️ Parcial — só o fluxo de approvals de pendentes (`approve`/`reject`) existe |
| `/tickets/*`, `/tickets/export`, `/residents` GET + approve/reject, `/condos/me`, `/condos/{id}/managers` | ✅ Consumidos                                                                 |
| `/managers/me/telegram`                                                                                   | 📋 Backlog documentado em `docs/backlog.md` (exige mudanças no Core)          |

Leitura: o módulo de **tickets está maduro** (inbox, detalhe, Kanban, export, approvals). O buraco é o módulo de **estrutura/moradores** — e o Core já entrega tudo que é preciso para preenchê-lo, sem dependência de backend.

## Sequência sugerida de plans

### Plan 8 — Estrutura do condomínio (blocos, unidades, áreas comuns)

Dividido em dois (decisão do brainstorm 2026-07-21):

- **Plan 8.1 — Blocos + Unidades** — detalhado em [`docs/superpowers/plans/2026-07-21-plan-8-1-blocks-units-crud.md`](./superpowers/plans/2026-07-21-plan-8-1-blocks-units-crud.md) (12 tasks, TDD). CRUD completo com modal local, toasts com retry e confirmação destrutiva com copy de consequência.
- **Plan 8.2 — Áreas comuns** — outline no final do doc do 8.1; detalhar após a entrega do 8.1.

Contexto comum:

- Substituir os 3 placeholders (`structure/blocks|units|common-areas`) por CRUDs reais.
- Zero dependência de mudança no Core.
- Reaproveita padrões consolidados (hooks + mappers + `EmptyState` + `Modal` + `notify`).
- **Desbloqueia** o ticket create: `useCreateTicket` já tem `location: "unit" | "common_area"`, mas não há dados reais para popular um seletor de unidades/áreas.

### Plan 9 — Gestão de moradores + convites

- Página de moradores: lista, criar (`POST /residents`), editar, ativar/desativar (`/status`).
- Fluxo de invite-tokens: síndico gera link de convite → morador se cadastra → cai no funil de approvals **que já existe**. Fecha o ciclo de onboarding (hoje dá para aprovar, mas não para convidar).
- Também sem dependência de Core.

### Plan 10 — Notificações (Telegram + preferências)

- Item mais documentado do backlog (`docs/backlog.md`): decisão Opção A (deep link com token de pareamento) já tomada.
- **Exige coordenação com o repo Core** (endpoints `/pair` + `/status` + handler no bot) — por isso fica depois dos plans 8–9, que são frontend-puro.

## Quick wins paralelos (não precisam de plan dedicado)

- **Settings page**: hoje placeholder — conteúdo mínimo por ora (dados do condo via `/condos/me`, lista de gestores); vira a casa das preferências de notificação quando o Plan 10 chegar.
- **Seletor real de unidade/área comum** no `TicketCreateModal` — follow-up do Plan 8.
