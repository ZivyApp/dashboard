# Plan 6.5 — Ticket detail page (timeline + composer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o `TicketDetailModal` (Plan 4, Radix Dialog sobre o inbox) por uma página page-level em `/c/$condoId/tickets/$ticketId` com header, controle de status, **atribuição (assumir + atribuir a outro manager)**, timeline de eventos do Core e composer de comentário — fechando o rename `features/inbox/` → `features/tickets/` e repontando o clique de ticket das overviews. Inclui uma fatia vertical no Core (Task 1, gate): endpoint `assign-to` + resolução de identidade de managers atrás de uma porta.

**Architecture:** TanStack Query + `openapi-fetch` direto (sem repository — endpoints já existem ou são criados na Task 1, YAGNI). Uma query de eventos (`useTicketEvents`), uma de managers do condo (`useCondoManagers`) e quatro mutations (`useUpdateStatus`, `useClaimTicket`, `useAssignTo`, `useAddComment`), todas invalidando `["ticket", id]` e `["ticket-events", id]` no sucesso. A timeline é montada por um helper puro (`buildTimeline`) que prepende um item `created` UI-only derivado de `ticket.created_at` (o Core **não** emite evento `created`). Escopo multi-tenant continua vindo do header global `X-Condo-ID` (`getActiveCondoId`) — hooks recebem só `ticketId` como queryKey. Controles de escrita (status/atribuição/composer) são gated por role em UI via `useCanManageTicket(condoId)` (≥ `staff`), reforçando o `beforeLoad` da rota. **No Core**, a identidade (email/nome) dos managers é resolvida atrás de `ports.IdentityResolver` (adapter Supabase lê `auth.users`) — desacoplar do Supabase depois = reescrever um único adapter.

**Tech Stack:** React 19 · TanStack Query/Router · TypeScript strict · `openapi-fetch` · CSS Modules + design tokens · Vitest + Testing Library · Storybook 8.

---

## Pré-requisito BLOQUEANTE — fatia vertical no Core (Task 1)

> **Gate:** o frontend (Task 2 em diante) **não pode começar** antes da Task 1 estar **mergeada no Core** e os tipos do dashboard regenerados. A Task 1 **registra e executa**: implementa de fato, no repositório Core (Go, TDD), (a) `PATCH /tickets/{id}/assign-to`, (b) `GET /condos/{id}/managers` resolvendo email/nome dos managers, e (c) a resolução de identidade atrás de uma porta. Abre PR, mergeia, e só então destrava o frontend.

**Decisão de arquitetura (2026-05-23).** Não construir endpoint órfão: como o frontend desta Slice vai **atribuir a outro manager** e mostrar o **responsável pelo nome**, a Task 1 entrega a fatia vertical completa. O acoplamento ao Supabase para ler identidade é **incremental** (o Core já depende do Supabase Auth: todo `user_id` é UUID do Supabase, JWT, `app_metadata`, FK `invite_token.created_by → auth.users`). Mantemos o lock-in baixo **isolando a leitura atrás de uma porta** (`ports.IdentityResolver`), com adapter Supabase. Trocar de provedor depois = reescrever um adapter, não o domínio.

**Dados de identidade.** `condo_managers` só guarda `user_id` (Supabase Auth), `condo_id`, `role`, `telegram_chat_id` — **sem nome/email**. Email vive em `auth.users.email`; o nome humano em `auth.users.raw_user_meta_data` (JSONB; chaves comuns `full_name`/`name`/`display_name`, nem sempre preenchidas). Por isso o picker é **email-first** (nome quando houver). `condo_managers` **não tem write-path no Core** (linhas vêm de fora — seed/Supabase), então **não** dá pra denormalizar o nome lá agora; resolver via `auth.users` é o caminho. Ver [[project_core_no_manager_names]].

**Entregas da Task 1:**

- `PATCH /tickets/{id}/assign-to { assignee_id }` (valida assignee `staff+` no condo).
- `GET /condos/{id}/managers` → `[{ user_id, email, name?, role }]` (managers/staff do condo, identidade resolvida via porta). Gate de leitura `staff+`.
- `ports.IdentityResolver` + adapter `SupabaseIdentityRepository` (lê `auth.users` via pool; query crua, isolada). Grant `SELECT` em `auth.users` para o role do Core (Step de verificação).

**Frontend (Tasks 2+) consome ambos:** "Assumir ticket" (self, `/assign`) + picker de "Atribuir a outro" (`/assign-to`) + nome do responsável resolvido da lista de managers.

---

## Contexto do Core (ground truth — não inventar campos)

Endpoints (todos em `develop`, tenant via header global `X-Condo-ID`; shapes em `src/api/types.ts`):

- `GET /tickets/{id}` → `TicketResponse`. **Já consumido** por `useTicket` (hoje em `src/features/inbox/useTicket.ts`; a Task 2 o move para `src/features/tickets/`).
- `GET /tickets/{id}/events` → `TicketEventResponse[]` ordenado cronologicamente (`types.ts:1890`).
- `PATCH /tickets/{id}/status` → body `UpdateTicketStatusRequest` = `{ status?: string }`. Resposta `{ [k]: string }` (não é o ticket).
- `PATCH /tickets/{id}/assign` → **sem body** (`requestBody?: never`, `types.ts:1774`). Auto-atribui ao manager logado; muda status `open → in_progress`. Resposta `TicketResponse`.
- `POST /tickets/{id}/comments` → body `AddCommentRequest` = `{ text?: string }` (campo **`text`**, não `note`). Resposta `TicketEventResponse` (201) com `event_type = "comment_added"`, `payload = { text }`.
- **`PATCH /tickets/{id}/assign-to`** → body `{ assignee_id: string }`. **Criado na Task 1.** Atribui a outro manager/staff (valida membership). Resposta `TicketResponse`. Emite evento `assigned` com `payload.assignee_id`.
- **`GET /condos/{id}/managers`** → `CondoManagerResponse[]` = `{ user_id, email, name, role }`. **Criado na Task 1.** Identidade resolvida via `auth.users`; `name` pode vir `""` (usar email como fallback). Gate `staff+`. Tudo opcional na geração — refinar com type guard.

`TicketEventResponse` (`types.ts:2405`, tudo opcional na geração):

```
actor_id?, actor_type?, created_at?, event_type?, id?, payload?: { [k]: unknown }, ticket_id?
```

- **`event_type`**: `status_changed | assigned | comment_added` (constantes em `core/internal/domain/ticket_event.go:12-14`). **Não há `created`** — o handoff inventou. Derivar item `created` UI-only de `ticket.created_at`.
- **`actor_type`**: `manager | resident | system` (`ticket_event.go:20-22`). Usar para escolher a label de autor e a cor da dot. O Core **não** devolve nome do autor nos eventos — só `actor_id` (UUID). **Honrar tipagem honesta:** exibir label genérica por `actor_type` (`Gestor` / `Morador` / `Sistema`), **não** fabricar nome.
- **`payload` de `comment_added`**: `{ text: string }`. O corpo do comentário sai de `payload.text` (**não** `payload.note`).
- **`payload` de `status_changed`**: chaves **não garantidas** pela geração (payload é `Record<string, unknown>`). O guard `statusChange()` (Task 4-helper) tenta refinar `from`/`to` como `TicketStatus`; quando ausentes, a timeline cai numa label genérica ("mudou o status"). Sem `as` — refino via `isTicketStatus`.

### Desvios conscientes do handoff (`docs/handoff/zivy-wa-green/project/src/page-ticket-detail.jsx`)

| Item do mock                                             | Decisão neste plano                                                                                                                                                                                              |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Menu "Responsável" com lista de managers (`onAssign(m)`) | **Substituído por um único botão "Assumir ticket"** (auto-atribuição). Atribuir a outro manager = follow-up (Task 1).                                                                                            |
| Chip `ticket.category`                                   | **Omitido.** Core não modela categoria em `TicketResponse`.                                                                                                                                                      |
| `ticket.resident.phone` (contato)                        | **Omitido.** `TicketResponse` não traz telefone do morador (só `resident_name`). Não inventar.                                                                                                                   |
| Composer: "morador será notificado via Telegram" + ícone | **Removido.** `service.AddComment` (`ticket_service.go:210`) só persiste o evento — **não** dispara `NotificationSender`. Notificações saem em `CreateTicket` (l.116) e `Assign` (l.205). Texto enganoso → fora. |
| `ev.actor` (nome)                                        | Label por `actor_type` (ver acima).                                                                                                                                                                              |
| Avatares na timeline                                     | Dot temática por `actor_type` (CSS do handoff `.tl-dot`), sem avatar.                                                                                                                                            |

---

## File structure

```
src/
├── types/
│   ├── ticket.ts                         # MODIFICAR — adicionar assigned_to? ao Ticket
│   ├── ticketEvent.ts                    # NOVO — TicketEvent domain + guards + buildTimeline
│   └── ticketEvent.test.ts               # NOVO
├── lib/
│   ├── formatFullTime.ts                 # NOVO — data absoluta pt-BR (extraído do modal)
│   └── formatFullTime.test.ts            # NOVO
├── features/
│   ├── tickets/
│   │   ├── useTicket.ts                   # MOVIDO de features/inbox/ (git mv)
│   │   ├── useTicket.test.tsx             # MOVIDO de features/inbox/
│   │   └── useCanManageTicket.ts          # NOVO — gate de role (≥ staff) por condo
│   │   └── useCanManageTicket.test.tsx    # NOVO
│   ├── ticket-detail/                     # NOVO (toda a slice)
│   │   ├── useTicketEvents.ts             # GET /tickets/{id}/events
│   │   ├── useTicketEvents.test.tsx
│   │   ├── useUpdateStatus.ts             # PATCH /tickets/{id}/status
│   │   ├── useUpdateStatus.test.tsx
│   │   ├── useClaimTicket.ts              # PATCH /tickets/{id}/assign (self, sem body)
│   │   ├── useClaimTicket.test.tsx
│   │   ├── useAssignTo.ts                 # PATCH /tickets/{id}/assign-to { assignee_id }
│   │   ├── useAssignTo.test.tsx
│   │   ├── useCondoManagers.ts            # GET /condos/{id}/managers (email/nome/role)
│   │   ├── useCondoManagers.test.tsx
│   │   ├── useAddComment.ts               # POST /tickets/{id}/comments { text }
│   │   ├── useAddComment.test.tsx
│   │   ├── TicketStatusControl.tsx        # segmented 4 status
│   │   ├── TicketStatusControl.test.tsx
│   │   ├── TicketStatusControl.module.css
│   │   ├── TicketAssignControl.tsx        # "Assumir" + picker "Atribuir a outro" + responsável
│   │   ├── TicketAssignControl.test.tsx
│   │   ├── TicketAssignControl.module.css
│   │   ├── TicketTimeline.tsx
│   │   ├── TicketTimeline.test.tsx
│   │   ├── TicketTimeline.module.css
│   │   ├── TicketTimeline.stories.tsx
│   │   ├── TicketComposer.tsx
│   │   ├── TicketComposer.test.tsx
│   │   ├── TicketComposer.module.css
│   │   ├── TicketDetailPage.tsx           # composição
│   │   ├── TicketDetailPage.test.tsx
│   │   └── TicketDetailPage.module.css
│   └── inbox/                             # DELETAR ao fim (Task 13)
│       ├── TicketDetailModal.{tsx,test.tsx,module.css}   # remover
│       ├── useTicket.{ts,test.tsx}                       # movido p/ tickets/
└── app/routes/_app/c/$condoId/
    ├── tickets/$ticketId.tsx              # MODIFICAR — sai placeholder, entra TicketDetailPage
    └── inbox/$ticketId.tsx                # MODIFICAR — vira redirect (beforeLoad → throw redirect)
```

CSS: copiar de `docs/handoff/zivy-wa-green/project/styles.css` — `.seg` (l.953), `.timeline`/`.tl-*` (l.1020), `.composer` (l.1108) — adaptando para CSS Modules com nomes locais e tokens (`stylelint-declaration-strict-value` está ativo — usar `var(--...)`, nunca valores crus).

---

## Convenções (lembretes obrigatórios — todas as tasks)

- **Identificadores em inglês**; UI e comentários em pt-BR.
- **Tipagem honesta**: sem `any`/`as Domain`/`@ts-ignore`. Payload de API refinado por type guard. `unknown` só com narrowing.
- **`exactOptionalPropertyTypes`**: omitir a chave em objetos opcionais; tipar `prop?: T`, nunca `prop: T | undefined`.
- **Handlers com Promise**: envolver em `() => { void mutate(); }`.
- **Botões** default `type="button"` (o `Button` do projeto já força isso).
- **CSS Modules**: classe via `Record<K, string>` com fallback `?? ""`.
- **Hooks que importam `@/api/client`**: testar com `vi.mock("@/api/client", …)` + `vi.hoisted`, **nunca** `vi.spyOn` (carrega `@/lib/env` e quebra CI sem `.env.local`).
- **`routeTree.gen.ts`** é commitado; regenerar via `npm run dev` e **matar o PID** depois.
- Commits frequentes, um por step de commit.

---

## Task 1 (BLOQUEANTE) — fatia vertical no Core: `assign-to` + managers com identidade

> **Repositório:** `~/Documentos/Projetos/ZivyApp/core` (Go, hexagonal: `domain` → `ports` → `app` → `adapters`). Stack: chi, sqlc, swaggo, Fx, pgtype/pgx, Taskfile.
> **Esta task é o gate.** Frontend (Task 2+) só começa depois dela mergeada no Core e dos tipos do dashboard regenerados (Step 13). Trabalhar numa branch do **Core**. Padrões do repo: `parseUUID(chi.URLParam(r,"id"))`, `authorizeCondo(user, condoUUID)` p/ checar membership do condo no path, `MustUserFromContext`, `writeJSON`/`writeError`, erros `domain.ErrNotFound`/`ErrInvalidInput`.

### Como executar a Task 1 (ler antes de começar)

Esta task é a parte mais cara do plano (estimativa: **~3–5h de execução** + seu tempo de revisar/mergear o PR do Core; **~400k–900k tokens**, menos com cache quente). **Não tentar junto com o frontend na mesma sessão.** Recomendações:

- **Sessão dedicada e só-Core.** Abrir o Claude Code **no diretório do Core** (`~/Documentos/Projetos/ZivyApp/core`), não no dashboard — contexto menor e mais barato. Há um worktree `core/.worktrees/frontend-prereqs-core` que pode ser reaproveitado para isolar.
  - **Referenciar este plano por caminho absoluto.** A sessão roda no `/core`, mas o plano vive no `/dashboard` — é só um arquivo no disco, então passar o path completo: `/home/adams/Documentos/Projetos/ZivyApp/dashboard/docs/superpowers/plans/2026-05-23-plan-6-5-ticket-detail.md`.
  - **Contexto/MCP serão os do Core.** O grafo `code-review-graph`, hooks e `CLAUDE.md` carregados serão os do repo Core (não os do dashboard) — é o esperado; só não estranhar instruções diferentes.
  - **Steps 1–12 são no Core; o Step 13 é no dashboard.** O `sync:swagger`/`gen:api` (Step 13) roda no `/dashboard` — fazer de volta numa sessão do dashboard (junto com a branch da Task 2), não pela sessão do Core.
- **Execução inline (não subagent-driven).** É um fluxo Go sequencial e interdependente (query sqlc → repo → service → injeção no construtor → Fx → testes → handler → rota). Subagentes frescos pagariam re-leitura cara a cada bloco; subagent-driven só compensa nas Tasks 2–17 (frontend, independentes).
- **Resolver a incógnita do grant PRIMEIRO** (Step 4): rodar o `psql "SELECT id, email FROM auth.users LIMIT 1;"`. Se travar em permissão, decidir a migration de `GRANT` antes de escrever o resto — é o maior risco de estouro de escopo (pode exigir decisão de permissão em prod).
- **Riscos de iteração a ter em mente:** loops de compilação Go ao injetar `managerRepo` no `ticketService` (construtor + Fx + todos os call sites de teste); nomes gerados pelo sqlc (`NullUserRole.UserRole`/`.Valid`) podem não bater de primeira; testes de integração (`task test:integration`) exigem Postgres local — sem ele, validar o adapter de identidade só via `psql` manual.
- **Gate humano:** o PR do Core precisa ser mergeado por você antes de o frontend começar. Após o merge, rodar o Step 13 (`sync:swagger`/`gen:api`) no dashboard.
- **Retomar com:** _"executar a Task 1 do plan 6.5 (`docs/superpowers/plans/2026-05-23-plan-6-5-ticket-detail.md`) no repo Core"_ — todos os steps já têm o código pronto.

**Files (no repo Core):**

- Create: `internal/domain/identity.go` (`UserIdentity`)
- Modify: `internal/ports/driven.go` (`IdentityResolver`; `GetRole` + `ListByCondo` na `ManagerRepository`)
- Modify: `internal/ports/driving.go` (`ManagerService.ListCondoManagers`)
- Create: `internal/adapters/postgres/identity_repository.go` (adapter Supabase — lê `auth.users`)
- Modify: `internal/adapters/postgres/module.go` (provider do adapter)
- Modify: `db/queries/managers.sql` (query `ListManagersByCondo`) → `task db:gen`
- Modify: `internal/adapters/postgres/repository.go` (`GetRole`, `ListByCondo`)
- Modify: `internal/app/manager_service.go` (+ `IdentityResolver` dep; `ListCondoManagers`)
- Modify: `internal/app/ticket_service.go` (+ `managerRepo`; valida assignee em `Assign`)
- Modify: `internal/adapters/http/manager_handler.go` (DTO + handler `listManagers` + rota + swagger)
- Modify: `internal/adapters/http/ticket_handler.go` (`AssignToRequest` + handler `assignTo` + swagger)
- Modify: `internal/adapters/http/router.go` (rotas novas)
- Modify: testes correspondentes (`*_test.go` + mocks em `internal/app/mock_driven_test.go`)
- Generated: `docs/swagger.json`, `docs/docs.go` (via `task docs:gen`), `internal/adapters/postgres/db/*` (via `task db:gen`)

- [ ] **Step 1: Registrar a issue da fatia no Core**

```bash
gh issue create --repo ZivyApp/core \
  --title "Tickets: atribuir a outro manager + listar managers do condo com identidade" \
  --body "Plan 6.5 (dashboard). Entregas: (1) PATCH /tickets/{id}/assign-to { assignee_id } validando assignee staff+; (2) GET /condos/{id}/managers -> [{user_id,email,name?,role}]; (3) ports.IdentityResolver + adapter Supabase lendo auth.users (email + raw_user_meta_data). Mantém o acoplamento ao Supabase isolado no adapter."
```

Expected: imprime a URL da issue. Anotar para o PR. Se `gh` falhar por permissão, criar manualmente. **Não prosseguir sem registrar.**

- [ ] **Step 2: Branch no Core**

```bash
cd ~/Documentos/Projetos/ZivyApp/core
git checkout main && git pull && git checkout -b feature/ticket-assign-to-and-managers
```

- [ ] **Step 3: Domain `UserIdentity` + porta `IdentityResolver`**

Create `internal/domain/identity.go`:

```go
package domain

import "github.com/jackc/pgx/v5/pgtype"

// UserIdentity é a identidade humana de um usuário, resolvida a partir do
// provedor de auth (hoje Supabase). Name pode vir vazio (nem todo usuário
// tem nome no metadata) — email é o identificador estável.
type UserIdentity struct {
	UserID pgtype.UUID
	Email  string
	Name   string // "" quando ausente no provedor
}
```

Em `internal/ports/driven.go`, adicionar a porta (perto das outras interfaces de repositório):

```go
// IdentityResolver resolve identidade humana (email/nome) por user_id.
// Implementado por um adapter do provedor de auth (Supabase). Isola o
// acoplamento: trocar de provedor = trocar o adapter.
type IdentityResolver interface {
	ResolveByIDs(ctx context.Context, userIDs []pgtype.UUID) ([]domain.UserIdentity, error)
}
```

> Conferir se `driven.go` já importa `context`/`domain`/`pgtype` (sim — usado pelas outras interfaces).

- [ ] **Step 4: Adapter Supabase `IdentityResolver` (lê `auth.users`) + Fx + grant**

Create `internal/adapters/postgres/identity_repository.go`:

```go
package postgres

import (
	"context"
	"fmt"

	"github.com/ZivyApp/core/internal/domain"
	"github.com/ZivyApp/core/internal/ports"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type supabaseIdentityRepository struct {
	pool *pgxpool.Pool
}

// NewIdentityResolver cria o adapter que lê identidade do schema auth do Supabase.
func NewIdentityResolver(pool *pgxpool.Pool) ports.IdentityResolver {
	return &supabaseIdentityRepository{pool: pool}
}

// ResolveByIDs lê email + nome (raw_user_meta_data) de auth.users. Query crua
// (auth.users não está no schema sqlc do Core) — acoplamento contido aqui.
func (r *supabaseIdentityRepository) ResolveByIDs(ctx context.Context, userIDs []pgtype.UUID) ([]domain.UserIdentity, error) {
	if len(userIDs) == 0 {
		return []domain.UserIdentity{}, nil
	}
	const q = `
		SELECT id,
		       COALESCE(email, '') AS email,
		       COALESCE(
		         raw_user_meta_data->>'full_name',
		         raw_user_meta_data->>'name',
		         raw_user_meta_data->>'display_name',
		         ''
		       ) AS name
		FROM auth.users
		WHERE id = ANY($1)`
	rows, err := r.pool.Query(ctx, q, userIDs)
	if err != nil {
		return nil, fmt.Errorf("supabaseIdentityRepository.ResolveByIDs: %w", err)
	}
	defer rows.Close()

	out := make([]domain.UserIdentity, 0, len(userIDs))
	for rows.Next() {
		var ident domain.UserIdentity
		if err := rows.Scan(&ident.UserID, &ident.Email, &ident.Name); err != nil {
			return nil, fmt.Errorf("supabaseIdentityRepository.ResolveByIDs: scan: %w", err)
		}
		out = append(out, ident)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("supabaseIdentityRepository.ResolveByIDs: %w", err)
	}
	return out, nil
}
```

Registrar no Fx — em `internal/adapters/postgres/module.go`, adicionar `NewIdentityResolver` à lista de `fx.Provide(...)`.

**Grant (verificação):** o role de conexão do Core precisa de `SELECT` em `auth.users`. Verificar localmente:

```bash
cd ~/Documentos/Projetos/ZivyApp/core
task db:reset >/dev/null 2>&1 || true   # garante banco local migrado/seed
# substituir <core_role> pelo role da connection string do Core (ex.: postgres/service_role local)
psql "$DATABASE_URL" -c "SELECT id, email FROM auth.users LIMIT 1;"
```

Se der permission denied, criar migration `supabase/migrations/<ts>_grant_core_read_auth_users.sql` com `GRANT USAGE ON SCHEMA auth TO <core_role>; GRANT SELECT ON auth.users TO <core_role>;` e rodar `task db:migrate`. Em produção (Supabase gerenciado) o role do Core normalmente já lê `auth`; documentar no PR a necessidade do grant.

- [ ] **Step 5: Query `ListManagersByCondo` (sqlc)**

Em `db/queries/managers.sql`, adicionar:

```sql
-- name: ListManagersByCondo :many
SELECT user_id, role FROM condo_managers
WHERE condo_id = $1
ORDER BY role, user_id;
```

Regenerar:

```bash
task db:gen   # sqlc generate
```

Expected: `internal/adapters/postgres/db/managers.sql.go` ganha `ListManagersByCondo` + params.

- [ ] **Step 6: `ManagerRepository.GetRole` + `ListByCondo` (porta + impl)**

Em `internal/ports/driven.go`, na interface `ManagerRepository`:

```go
	// GetRole devolve a role do usuário no condo; ErrNotFound se não for membro.
	GetRole(ctx context.Context, condoID, userID pgtype.UUID) (domain.UserRole, error)
	// ListByCondo lista (user_id, role) dos membros do condo.
	ListByCondo(ctx context.Context, condoID pgtype.UUID) ([]domain.Manager, error)
```

Em `internal/adapters/postgres/repository.go` (perto dos métodos de `managerRepository`, ~l.697):

```go
func (r *managerRepository) GetRole(ctx context.Context, condoID, userID pgtype.UUID) (domain.UserRole, error) {
	role, err := r.queries.GetManagerRole(ctx, db.GetManagerRoleParams{UserID: userID, CondoID: condoID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", domain.ErrNotFound
		}
		return "", fmt.Errorf("managerRepository.GetRole: %w", err)
	}
	if !role.Valid {
		return "", domain.ErrNotFound
	}
	return domain.UserRole(role.UserRole), nil
}

func (r *managerRepository) ListByCondo(ctx context.Context, condoID pgtype.UUID) ([]domain.Manager, error) {
	rows, err := r.queries.ListManagersByCondo(ctx, condoID)
	if err != nil {
		return nil, fmt.Errorf("managerRepository.ListByCondo: %w", err)
	}
	out := make([]domain.Manager, 0, len(rows))
	for _, row := range rows {
		out = append(out, domain.Manager{
			UserID:  row.UserID,
			CondoID: condoID,
			Role:    domain.UserRole(row.Role.UserRole),
		})
	}
	return out, nil
}
```

> Conferir nomes gerados pelo sqlc (`NullUserRole.UserRole`/`.Valid`; `ListManagersByCondoRow.UserID`/`.Role`). Ajustar conforme o struct real. `errors`/`fmt`/`pgx`/`db` já são importados no arquivo.

- [ ] **Step 7: `ManagerService.ListCondoManagers` (resolve identidade) — teste + impl**

Em `internal/ports/driving.go`, na interface `ManagerService`, adicionar:

```go
	// ListCondoManagers lista os managers/staff do condo com identidade (email/nome) resolvida.
	ListCondoManagers(ctx context.Context, condoID pgtype.UUID) ([]domain.CondoManagerIdentity, error)
```

Adicionar o tipo de saída em `internal/domain/manager.go`:

```go
// CondoManagerIdentity combina membership (role) com identidade resolvida.
type CondoManagerIdentity struct {
	UserID pgtype.UUID
	Email  string
	Name   string
	Role   UserRole
}
```

Em `internal/app/manager_service.go`: injetar `managerRepo` (já tem) + `identity ports.IdentityResolver` no struct e no `NewManagerService`. Implementar:

```go
func (s *managerService) ListCondoManagers(ctx context.Context, condoID pgtype.UUID) ([]domain.CondoManagerIdentity, error) {
	members, err := s.managerRepo.ListByCondo(ctx, condoID)
	if err != nil {
		return nil, fmt.Errorf("managerService.ListCondoManagers: %w", err)
	}
	ids := make([]pgtype.UUID, 0, len(members))
	for _, m := range members {
		ids = append(ids, m.UserID)
	}
	idents, err := s.identity.ResolveByIDs(ctx, ids)
	if err != nil {
		return nil, fmt.Errorf("managerService.ListCondoManagers: %w", err)
	}
	byID := make(map[string]domain.UserIdentity, len(idents))
	for _, ident := range idents {
		byID[uuidToString(ident.UserID)] = ident
	}
	out := make([]domain.CondoManagerIdentity, 0, len(members))
	for _, m := range members {
		ident := byID[uuidToString(m.UserID)] // zero-value (email/name "") se não resolveu
		out = append(out, domain.CondoManagerIdentity{
			UserID: m.UserID,
			Email:  ident.Email,
			Name:   ident.Name,
			Role:   m.Role,
		})
	}
	return out, nil
}
```

> `uuidToString` já existe no pacote `app` (usado em `ticket_service.go`). Atualizar `NewManagerService` e seus call sites/Fx (Fx resolve por tipo — `IdentityResolver` provido no Step 4).

Teste em `internal/app/manager_service_test.go` (criar se não existir): mock `ManagerRepository.ListByCondo` devolve 2 membros; mock `IdentityResolver.ResolveByIDs` devolve identidade de 1 (o outro fica com email/nome vazios) → assert que o resultado tem 2 itens, o resolvido com email, o não-resolvido com `Email == ""` e `Role` preservada.

- [ ] **Step 8: Rodar testes do service**

```bash
go test ./internal/app/... -run TestManagerService -race
```

Expected: PASS (após impl + mocks atualizados em `mock_driven_test.go` com `GetRole`, `ListByCondo`, e um `mockIdentityResolver`).

- [ ] **Step 9: Handler `GET /condos/{id}/managers` + DTO + rota + swagger**

Em `internal/adapters/http/manager_handler.go`, adicionar DTO + handler (espelhando `invite_token_handler.list` para o path `{id}` + `authorizeCondo`):

```go
// CondoManagerResponse é o DTO de um membro do condo com identidade.
type CondoManagerResponse struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Name   string `json:"name"`
	Role   string `json:"role"`
}

// @Summary      Listar managers/staff do condo
// @Description  Lista os membros (manager/staff) do condo com email/nome resolvidos. Para atribuição de tickets.
// @Tags         Managers
// @Produce      json
// @Param        id   path      string  true  "UUID do Condo"
// @Security     BearerAuth
// @Success      200  {array}   CondoManagerResponse
// @Failure      400  {object}  map[string]string "ID inválido"
// @Failure      403  {object}  map[string]string "Condo não corresponde ao ativo"
// @Router       /condos/{id}/managers [get]
func (h *ManagerHandler) listManagers(w http.ResponseWriter, r *http.Request) {
	condoUUID, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil || !condoUUID.Valid {
		writeError(w, http.StatusBadRequest, "invalid condo id")
		return
	}
	user := middleware.MustUserFromContext(r.Context())
	if !authorizeCondo(user, condoUUID) {
		writeError(w, http.StatusForbidden, "condo id does not match active condo")
		return
	}

	members, err := h.service.ListCondoManagers(r.Context(), condoUUID)
	if err != nil {
		slog.ErrorContext(r.Context(), "ManagerHandler.listManagers", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to list managers")
		return
	}

	resp := make([]CondoManagerResponse, 0, len(members))
	for _, m := range members {
		resp = append(resp, CondoManagerResponse{
			UserID: uuidToString(m.UserID),
			Email:  m.Email,
			Name:   m.Name,
			Role:   string(m.Role),
		})
	}
	writeJSON(w, http.StatusOK, resp)
}
```

> `uuidToString` no pacote `http`: conferir se existe um helper equivalente (ex.: `m.UserID` → string). Se não, usar o mesmo padrão dos outros handlers para serializar `pgtype.UUID`.

Em `internal/adapters/http/router.go`, no grupo de leitura (`RequireRole(RoleManager, RoleStaff, RoleViewer)` — ou restringir a `RoleManager, RoleStaff` se viewer não deve ver a lista; **escolher staff+** para não vazar membros a viewer), adicionar:

```go
			r.With(middleware.RequireRole(domain.RoleManager, domain.RoleStaff)).
				Get("/condos/{id}/managers", p.ManagerHandler.listManagers)
```

Teste em `manager_handler_test.go`: mock service `ListCondoManagers` → 200 + array; condo do path != ativo → 403.

- [ ] **Step 10: `assign-to` — service (validação) + handler + rota**

**Service.** Em `internal/app/ticket_service.go`: adicionar `managerRepo ports.ManagerRepository` ao struct `ticketService` e ao `NewTicketService` (Fx resolve por tipo). No início de `Assign`, antes do `AssignTicket`:

```go
	if !uuidEqual(actorID, assigneeUserID) {
		role, err := s.managerRepo.GetRole(ctx, condoID, assigneeUserID)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				return nil, fmt.Errorf("ticketService.Assign: assignee não é membro: %w", domain.ErrInvalidInput)
			}
			return nil, fmt.Errorf("ticketService.Assign: %w", err)
		}
		if role != domain.RoleManager && role != domain.RoleStaff {
			return nil, fmt.Errorf("ticketService.Assign: assignee precisa ser staff+: %w", domain.ErrInvalidInput)
		}
	}
```

> `uuidEqual`: comparar `pgtype.UUID` por `.Bytes` (ambos `Valid`). Se já houver helper no pacote, reusar; senão `func uuidEqual(a, b pgtype.UUID) bool { return a.Valid && b.Valid && a.Bytes == b.Bytes }`.

Atualizar `app.NewTicketService(...)` em `ticket_service_test.go:147` (e qualquer outro call site) para passar o `mockManagerRepository`. Adicionar casos de teste: assign-to com assignee staff+ → sucesso; assignee não-membro → `ErrInvalidInput` sem chamar `AssignTicket`; auto-assign (`actor==assignee`) → não chama `GetRole`.

**Handler.** Em `internal/adapters/http/ticket_handler.go`:

```go
// AssignToRequest é o payload para atribuir o ticket a outro manager/staff.
type AssignToRequest struct {
	AssigneeID string `json:"assignee_id"`
}

// @Summary      Atribuir ticket a outro manager/staff
// @Description  Atribui o ticket ao assignee_id (membro staff+ do condo). Distinto de /assign (auto).
// @Tags         Tickets
// @Accept       json
// @Produce      json
// @Param        id       path      string           true  "UUID do Ticket"
// @Param        request  body      AssignToRequest  true  "ID do assignee"
// @Security     BearerAuth
// @Success      200  {object}  TicketResponse
// @Failure      400  {object}  map[string]string "ID/assignee inválido"
// @Failure      404  {object}  map[string]string "Ticket não encontrado"
// @Router       /tickets/{id}/assign-to [patch]
func (h *TicketHandler) assignTo(w http.ResponseWriter, r *http.Request) {
	ticketUUID, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil || !ticketUUID.Valid {
		writeError(w, http.StatusBadRequest, "invalid ticket id")
		return
	}
	var req AssignToRequest
	if err := readJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json payload")
		return
	}
	assigneeUUID, err := parseUUID(req.AssigneeID)
	if err != nil || !assigneeUUID.Valid {
		writeError(w, http.StatusBadRequest, "invalid assignee id")
		return
	}
	user := middleware.MustUserFromContext(r.Context())
	ticket, err := h.service.Assign(r.Context(), user.ActiveCondo, ticketUUID, user.UserID, assigneeUUID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			writeError(w, http.StatusNotFound, "ticket not found")
			return
		}
		if errors.Is(err, domain.ErrInvalidInput) {
			writeError(w, http.StatusBadRequest, "invalid assignee")
			return
		}
		slog.Error("TicketHandler.assignTo: failed to assign ticket", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to assign ticket")
		return
	}
	writeJSON(w, http.StatusOK, mapTicketToResponse(ticket))
}
```

Adicionar `TestTicketHandler_AssignTo` (body válido → 200; assignee_id inválido → 400; service `ErrInvalidInput` → 400; `ErrNotFound` → 404), reusando o helper de contexto `context.WithValue(..., middleware.UserContextKey, user)` e o `mockTicketServiceTestify.Assign`.

**Rota.** Em `internal/adapters/http/router.go`, no grupo de escrita, após a linha do `/assign`:

```go
			r.Patch("/tickets/{id}/assign-to", p.TicketHandler.assignTo)
```

- [ ] **Step 11: Regenerar docs + suíte completa do Core**

```bash
cd ~/Documentos/Projetos/ZivyApp/core
task docs:gen
task lint
task test:unit
go build ./...
grep -c "assign-to" docs/swagger.json     # > 0
grep -c "/condos/{id}/managers" docs/swagger.json   # > 0
```

Expected: tudo verde; ambos os endpoints no swagger. (Testes de integração em `adapters/postgres` exigem DB local — rodar `task test:integration` se o ambiente tiver Postgres; senão, cobrir via unit + validar o adapter de identidade manualmente com o `psql` do Step 4.)

- [ ] **Step 12: Commit, PR e merge no Core**

```bash
git add -A
git commit -m "feat(tickets): assign-to + GET /condos/{id}/managers com identidade (IdentityResolver)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push -u origin feature/ticket-assign-to-and-managers
gh pr create --repo ZivyApp/core --base main --fill \
  --body "Fatia vertical p/ atribuição de tickets (Plan 6.5 dashboard): assign-to + listagem de managers com email/nome via IdentityResolver (adapter Supabase lê auth.users). Fecha #<issue>. Nota: requer GRANT SELECT em auth.users para o role do Core (ver migration). 🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Mergear seguindo o fluxo do Core. **O gate só libera após o merge.**

- [ ] **Step 13: Sincronizar tipos no dashboard (destrava o frontend)**

```bash
cd ~/Documentos/Projetos/ZivyApp/dashboard
npm run sync:swagger && npm run gen:api
git diff --stat src/api/openapi.json src/api/types.ts   # deve mostrar assign-to + condos/{id}/managers
```

Commitar junto da branch da Task 2 (ou logo após criá-la) com `chore(api): sync swagger (assign-to + condo managers)`. Concluída a Task 1, **o frontend está destravado**.

---

## Task 2: Branch + mover `useTicket` para `features/tickets/` + estender `Ticket`

**Files:**

- Branch nova a partir de `develop`.
- Move: `src/features/inbox/useTicket.ts` → `src/features/tickets/useTicket.ts`
- Move: `src/features/inbox/useTicket.test.tsx` → `src/features/tickets/useTicket.test.tsx`
- Modify: `src/features/inbox/TicketDetailModal.tsx` (import transitório — o modal será deletado na Task 13)
- Modify: `src/types/ticket.ts:15-28`

- [ ] **Step 1: Criar a branch**

```bash
git checkout develop && git pull && git checkout -b feature/plan-6-5-ticket-detail
```

- [ ] **Step 2: Mover `useTicket` + teste via `git mv`**

```bash
git mv src/features/inbox/useTicket.ts src/features/tickets/useTicket.ts
git mv src/features/inbox/useTicket.test.tsx src/features/tickets/useTicket.test.tsx
```

- [ ] **Step 3: Apontar o import transitório do modal**

Em `src/features/inbox/TicketDetailModal.tsx`, trocar a linha 6:

```tsx
import { useTicket } from "@/features/tickets/useTicket";
```

(O modal e este import somem na Task 13; o ajuste mantém o build verde até lá.)

- [ ] **Step 4: Adicionar `assigned_to?` ao `Ticket`**

Em `src/types/ticket.ts`, no `interface Ticket`, adicionar o campo (o guard `isCompleteTicket` **não** muda — campo é opcional):

```ts
export interface Ticket {
  id: string;
  protocol: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  resident_name?: string;
  unit_number?: string;
  block_name?: string;
  common_area_name?: string;
  description?: string;
  /** user_id do manager atribuído (vazio quando não atribuído). */
  assigned_to?: string;
  created_at?: string;
  updated_at: string;
}
```

- [ ] **Step 5: Rodar typecheck + testes do que se moveu**

Run: `npm run typecheck && npx vitest run src/features/tickets/useTicket.test.tsx`
Expected: PASS (o teste movido continua verde; nada importa mais `inbox/useTicket`).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(plan-6-5): move useTicket para features/tickets + Ticket.assigned_to"
```

---

## Task 3: `TicketEvent` domain — type, guards e `buildTimeline`

**Files:**

- Create: `src/types/ticketEvent.ts`
- Test: `src/types/ticketEvent.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

```ts
import { describe, it, expect } from "vitest";
import {
  isTicketEvent,
  toTicketEvent,
  commentText,
  statusChange,
  buildTimeline,
  type TicketEvent,
} from "./ticketEvent";

const raw = {
  id: "e1",
  ticket_id: "t1",
  event_type: "comment_added",
  actor_type: "manager",
  actor_id: "u1",
  created_at: "2026-05-20T10:00:00Z",
  payload: { text: "olá" },
};

describe("isTicketEvent / toTicketEvent", () => {
  it("aceita evento bem-formado", () => {
    expect(isTicketEvent(raw)).toBe(true);
    expect(toTicketEvent(raw)?.eventType).toBe("comment_added");
  });

  it("rejeita event_type desconhecido", () => {
    expect(isTicketEvent({ ...raw, event_type: "exploded" })).toBe(false);
    expect(toTicketEvent({ ...raw, event_type: "exploded" })).toBeNull();
  });

  it("rejeita actor_type desconhecido", () => {
    expect(isTicketEvent({ ...raw, actor_type: "alien" })).toBe(false);
  });

  it("rejeita quando falta created_at", () => {
    const { created_at: _omit, ...rest } = raw;
    expect(isTicketEvent(rest)).toBe(false);
  });
});

describe("commentText", () => {
  it("extrai payload.text de comment_added", () => {
    const ev = toTicketEvent(raw) as TicketEvent;
    expect(commentText(ev)).toBe("olá");
  });
  it("devolve null quando não há text", () => {
    const ev = toTicketEvent({ ...raw, payload: {} }) as TicketEvent;
    expect(commentText(ev)).toBeNull();
  });
});

describe("statusChange", () => {
  it("refina from/to válidos", () => {
    const ev = toTicketEvent({
      ...raw,
      event_type: "status_changed",
      payload: { from: "open", to: "in_progress" },
    }) as TicketEvent;
    expect(statusChange(ev)).toEqual({ from: "open", to: "in_progress" });
  });
  it("devolve null quando payload não tem status válido", () => {
    const ev = toTicketEvent({
      ...raw,
      event_type: "status_changed",
      payload: { note: "x" },
    }) as TicketEvent;
    expect(statusChange(ev)).toBeNull();
  });
});

describe("buildTimeline", () => {
  it("prepende item created UI-only a partir de createdAt e ordena asc", () => {
    const events: TicketEvent[] = [
      toTicketEvent(raw) as TicketEvent, // comment 10:00
      toTicketEvent({
        ...raw,
        id: "e2",
        event_type: "assigned",
        created_at: "2026-05-20T09:00:00Z",
        payload: {},
      }) as TicketEvent,
    ];
    const tl = buildTimeline(events, "2026-05-20T08:00:00Z");
    expect(tl.map((i) => i.kind)).toEqual(["created", "assigned", "comment_added"]);
    expect(tl[0]?.id).toBe("created:synthetic");
  });

  it("sem createdAt não cria item synthetic", () => {
    const tl = buildTimeline([], undefined);
    expect(tl).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/types/ticketEvent.test.ts`
Expected: FAIL ("Cannot find module './ticketEvent'").

- [ ] **Step 3: Implementar `ticketEvent.ts`**

```ts
import { isTicketStatus, type TicketStatus } from "./ticket";

export const TICKET_EVENT_TYPES = ["status_changed", "assigned", "comment_added"] as const;
export type TicketEventType = (typeof TICKET_EVENT_TYPES)[number];

export const TICKET_ACTOR_TYPES = ["manager", "resident", "system"] as const;
export type TicketActorType = (typeof TICKET_ACTOR_TYPES)[number];

export interface TicketEvent {
  id: string;
  ticketId: string;
  eventType: TicketEventType;
  actorType: TicketActorType;
  actorId?: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

function isEventType(v: unknown): v is TicketEventType {
  return typeof v === "string" && (TICKET_EVENT_TYPES as readonly string[]).includes(v);
}

function isActorType(v: unknown): v is TicketActorType {
  return typeof v === "string" && (TICKET_ACTOR_TYPES as readonly string[]).includes(v);
}

/** Type guard para o payload de `GET /tickets/{id}/events` (tudo opcional na geração). */
export function isTicketEvent(v: unknown): v is {
  id: string;
  ticket_id: string;
  event_type: TicketEventType;
  actor_type: TicketActorType;
  actor_id?: string;
  created_at: string;
  payload?: Record<string, unknown>;
} {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.ticket_id === "string" &&
    typeof o.created_at === "string" &&
    isEventType(o.event_type) &&
    isActorType(o.actor_type) &&
    (o.payload === undefined || (typeof o.payload === "object" && o.payload !== null))
  );
}

/** Converte o payload cru em `TicketEvent`; devolve `null` quando o item é inválido. */
export function toTicketEvent(v: unknown): TicketEvent | null {
  if (!isTicketEvent(v)) return null;
  return {
    id: v.id,
    ticketId: v.ticket_id,
    eventType: v.event_type,
    actorType: v.actor_type,
    ...(v.actor_id !== undefined ? { actorId: v.actor_id } : {}),
    createdAt: v.created_at,
    payload: v.payload ?? {},
  };
}

/** Corpo de um comentário (`comment_added`), refinado de `payload.text`. */
export function commentText(ev: TicketEvent): string | null {
  const t = ev.payload.text;
  return typeof t === "string" && t.length > 0 ? t : null;
}

/** Refina `from`/`to` de um `status_changed`; `null` quando o Core não envia status válidos. */
export function statusChange(ev: TicketEvent): { from?: TicketStatus; to: TicketStatus } | null {
  const to = ev.payload.to;
  if (!isTicketStatus(to)) return null;
  const from = ev.payload.from;
  return isTicketStatus(from) ? { from, to } : { to };
}

export type TimelineItem =
  | { kind: "created"; id: string; at: string }
  | { kind: TicketEventType; id: string; at: string; event: TicketEvent };

/**
 * Monta a timeline ordenada ascendente. Prepende um item `created` UI-only
 * derivado de `ticketCreatedAt` — o Core não emite evento `created`.
 */
export function buildTimeline(
  events: TicketEvent[],
  ticketCreatedAt: string | undefined,
): TimelineItem[] {
  const items: TimelineItem[] = events
    .map((event) => ({ kind: event.eventType, id: event.id, at: event.createdAt, event }))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  if (ticketCreatedAt) {
    items.unshift({ kind: "created", id: "created:synthetic", at: ticketCreatedAt });
  }
  return items;
}
```

- [ ] **Step 4: Rodar o teste, ver passar**

Run: `npx vitest run src/types/ticketEvent.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/ticketEvent.ts src/types/ticketEvent.test.ts
git commit -m "feat(plan-6-5): TicketEvent domain type, guards e buildTimeline"
```

---

## Task 4: `formatFullTime` (data absoluta pt-BR)

**Files:**

- Create: `src/lib/formatFullTime.ts`
- Test: `src/lib/formatFullTime.test.ts`

(Extrai o `formatAbsolute` que vivia inline no `TicketDetailModal` para `src/lib/`, reutilizável pela página e testável.)

- [ ] **Step 1: Escrever o teste falhando**

```ts
import { describe, it, expect } from "vitest";
import { formatFullTime } from "./formatFullTime";

describe("formatFullTime", () => {
  it("formata ISO em pt-BR com data e hora", () => {
    const out = formatFullTime("2026-05-20T13:05:00Z");
    expect(out).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(out).toMatch(/\d{2}:\d{2}/);
  });
  it("devolve travessão para undefined", () => {
    expect(formatFullTime(undefined)).toBe("—");
  });
  it("devolve travessão para data inválida", () => {
    expect(formatFullTime("não-é-data")).toBe("—");
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/lib/formatFullTime.test.ts`
Expected: FAIL ("Cannot find module './formatFullTime'").

- [ ] **Step 3: Implementar**

```ts
export function formatFullTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
```

- [ ] **Step 4: Rodar o teste, ver passar**

Run: `npx vitest run src/lib/formatFullTime.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/formatFullTime.ts src/lib/formatFullTime.test.ts
git commit -m "feat(plan-6-5): formatFullTime (data absoluta pt-BR)"
```

---

## Task 5: `useCanManageTicket` (gate de role ≥ staff)

**Files:**

- Create: `src/features/tickets/useCanManageTicket.ts`
- Test: `src/features/tickets/useCanManageTicket.test.tsx`

(Espelha `useCanApprove`, mas para `staff+` num condo específico — gate de UI dos controles de escrita. A rota já tem `requireRole`; isto evita renderizar botões que dariam 403.)

- [ ] **Step 1: Escrever o teste falhando**

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

const { mockUseMyCondos } = vi.hoisted(() => ({ mockUseMyCondos: vi.fn() }));
vi.mock("@/features/condo/useMyCondos", () => ({ useMyCondos: mockUseMyCondos }));

import { useCanManageTicket } from "./useCanManageTicket";

afterEach(() => vi.restoreAllMocks());

describe("useCanManageTicket", () => {
  it("true quando role no condo é staff+", () => {
    mockUseMyCondos.mockReturnValue({ data: [{ condoId: "c1", role: "manager" }] });
    const { result } = renderHook(() => useCanManageTicket("c1"));
    expect(result.current).toBe(true);
  });
  it("false quando role no condo é viewer", () => {
    mockUseMyCondos.mockReturnValue({ data: [{ condoId: "c1", role: "viewer" }] });
    const { result } = renderHook(() => useCanManageTicket("c1"));
    expect(result.current).toBe(false);
  });
  it("false quando o condo não está na membership", () => {
    mockUseMyCondos.mockReturnValue({ data: [{ condoId: "c2", role: "manager" }] });
    const { result } = renderHook(() => useCanManageTicket("c1"));
    expect(result.current).toBe(false);
  });
  it("false enquanto data não chegou", () => {
    mockUseMyCondos.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useCanManageTicket("c1"));
    expect(result.current).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/tickets/useCanManageTicket.test.tsx`
Expected: FAIL ("Cannot find module './useCanManageTicket'").

- [ ] **Step 3: Implementar**

```ts
import { useMyCondos } from "@/features/condo/useMyCondos";
import { isAtLeast } from "@/features/condo/roleHierarchy";

/** Permite ações de escrita no ticket (status/assumir/comentar) quando o usuário é staff+ no condo. */
export function useCanManageTicket(condoId: string): boolean {
  const { data } = useMyCondos();
  if (!data) return false;
  const membership = data.find((c) => c.condoId === condoId);
  return membership !== undefined && isAtLeast(membership.role, "staff");
}
```

- [ ] **Step 4: Rodar o teste, ver passar**

Run: `npx vitest run src/features/tickets/useCanManageTicket.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/tickets/useCanManageTicket.ts src/features/tickets/useCanManageTicket.test.tsx
git commit -m "feat(plan-6-5): useCanManageTicket (gate staff+ por condo)"
```

---

## Task 6: `useTicketEvents` (GET /tickets/{id}/events)

**Files:**

- Create: `src/features/ticket-detail/useTicketEvents.ts`
- Test: `src/features/ticket-detail/useTicketEvents.test.tsx`

- [ ] **Step 1: Escrever o teste falhando**

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { GET: mockGet } }));

import { useTicketEvents } from "./useTicketEvents";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

afterEach(() => {
  mockGet.mockReset();
  vi.restoreAllMocks();
});

describe("useTicketEvents", () => {
  it("mapeia e descarta itens inválidos", async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          id: "e1",
          ticket_id: "t1",
          event_type: "comment_added",
          actor_type: "manager",
          created_at: "2026-05-20T10:00:00Z",
          payload: { text: "oi" },
        },
        {
          id: "bad",
          ticket_id: "t1",
          event_type: "exploded",
          actor_type: "manager",
          created_at: "2026-05-20T11:00:00Z",
        },
      ],
      error: undefined,
    });
    const { result } = renderHook(() => useTicketEvents("t1"), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/tickets/{id}/events", {
      params: { path: { id: "t1" } },
    });
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.eventType).toBe("comment_added");
  });

  it("propaga erro do Core", async () => {
    mockGet.mockResolvedValue({ data: undefined, error: { message: "boom" } });
    const { result } = renderHook(() => useTicketEvents("t1"), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/ticket-detail/useTicketEvents.test.tsx`
Expected: FAIL ("Cannot find module './useTicketEvents'").

- [ ] **Step 3: Implementar**

```ts
import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { toTicketEvent, type TicketEvent } from "@/types/ticketEvent";

export function ticketEventsQueryOptions(ticketId: string) {
  return queryOptions({
    queryKey: ["ticket-events", ticketId] as const,
    queryFn: async (): Promise<TicketEvent[]> => {
      const { data, error } = await api.GET("/tickets/{id}/events", {
        params: { path: { id: ticketId } },
      });
      if (error) {
        throw new Error(`TicketsService.events(${ticketId}): falha em GET /tickets/{id}/events`, {
          cause: error,
        });
      }
      return (data ?? []).map(toTicketEvent).filter((e): e is TicketEvent => e !== null);
    },
    staleTime: 30_000,
  });
}

export function useTicketEvents(ticketId: string) {
  return useQuery(ticketEventsQueryOptions(ticketId));
}
```

- [ ] **Step 4: Rodar o teste, ver passar**

Run: `npx vitest run src/features/ticket-detail/useTicketEvents.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/ticket-detail/useTicketEvents.ts src/features/ticket-detail/useTicketEvents.test.tsx
git commit -m "feat(plan-6-5): useTicketEvents (GET /tickets/{id}/events)"
```

---

## Task 7: `useUpdateStatus` (PATCH /tickets/{id}/status)

**Files:**

- Create: `src/features/ticket-detail/useUpdateStatus.ts`
- Test: `src/features/ticket-detail/useUpdateStatus.test.tsx`

- [ ] **Step 1: Escrever o teste falhando**

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPatch } = vi.hoisted(() => ({ mockPatch: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { PATCH: mockPatch } }));

import { useUpdateStatus } from "./useUpdateStatus";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () => new QueryClient({ defaultOptions: { mutations: { retry: false } } });

afterEach(() => {
  mockPatch.mockReset();
  vi.restoreAllMocks();
});

describe("useUpdateStatus", () => {
  it("envia { status } e invalida ticket + events", async () => {
    mockPatch.mockResolvedValue({ data: { ok: "true" }, error: undefined });
    const qc = mkClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useUpdateStatus("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.updateStatus("resolved"));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    expect(mockPatch).toHaveBeenCalledWith("/tickets/{id}/status", {
      params: { path: { id: "t1" } },
      body: { status: "resolved" },
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket", "t1"] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket-events", "t1"] });
    });
  });

  it("expõe isError em falha", async () => {
    mockPatch.mockResolvedValue({ data: undefined, error: { message: "x" } });
    const { result } = renderHook(() => useUpdateStatus("t1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.updateStatus("closed"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/ticket-detail/useUpdateStatus.test.tsx`
Expected: FAIL ("Cannot find module './useUpdateStatus'").

- [ ] **Step 3: Implementar**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { TicketStatus } from "@/types/ticket";

export function useUpdateStatus(ticketId: string) {
  const qc = useQueryClient();
  const m = useMutation<void, Error, TicketStatus>({
    mutationFn: async (status) => {
      const { error } = await api.PATCH("/tickets/{id}/status", {
        params: { path: { id: ticketId } },
        body: { status },
      });
      if (error) {
        throw new Error(
          `TicketsService.updateStatus(${ticketId}): falha em PATCH /tickets/{id}/status`,
          {
            cause: error,
          },
        );
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      void qc.invalidateQueries({ queryKey: ["ticket-events", ticketId] });
    },
  });

  return {
    updateStatus: (status: TicketStatus, opts?: { onSuccess?: () => void }) =>
      m.mutate(status, opts),
    pendingStatus: m.isPending ? m.variables : undefined,
    isError: m.isError,
  };
}
```

- [ ] **Step 4: Rodar o teste, ver passar**

Run: `npx vitest run src/features/ticket-detail/useUpdateStatus.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/ticket-detail/useUpdateStatus.ts src/features/ticket-detail/useUpdateStatus.test.tsx
git commit -m "feat(plan-6-5): useUpdateStatus (PATCH /tickets/{id}/status)"
```

---

## Task 8: `useClaimTicket` (PATCH /tickets/{id}/assign, sem body)

**Files:**

- Create: `src/features/ticket-detail/useClaimTicket.ts`
- Test: `src/features/ticket-detail/useClaimTicket.test.tsx`

- [ ] **Step 1: Escrever o teste falhando**

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPatch } = vi.hoisted(() => ({ mockPatch: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { PATCH: mockPatch } }));

import { useClaimTicket } from "./useClaimTicket";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () => new QueryClient({ defaultOptions: { mutations: { retry: false } } });

afterEach(() => {
  mockPatch.mockReset();
  vi.restoreAllMocks();
});

describe("useClaimTicket", () => {
  it("chama assign sem body e invalida ticket + events", async () => {
    mockPatch.mockResolvedValue({ data: { id: "t1" }, error: undefined });
    const qc = mkClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useClaimTicket("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.claim());

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    expect(mockPatch).toHaveBeenCalledWith("/tickets/{id}/assign", {
      params: { path: { id: "t1" } },
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket", "t1"] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket-events", "t1"] });
    });
  });

  it("expõe isError em falha", async () => {
    mockPatch.mockResolvedValue({ data: undefined, error: { message: "x" } });
    const { result } = renderHook(() => useClaimTicket("t1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.claim());
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/ticket-detail/useClaimTicket.test.tsx`
Expected: FAIL ("Cannot find module './useClaimTicket'").

- [ ] **Step 3: Implementar**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export function useClaimTicket(ticketId: string) {
  const qc = useQueryClient();
  // PATCH /tickets/{id}/assign não aceita body — o Core lê o manager autenticado
  // (MustUserFromContext) e auto-atribui. Atribuir a outro manager é follow-up
  // (ver issue no Core registrada na Task 1 deste plano).
  const m = useMutation<void, Error, void>({
    mutationFn: async () => {
      const { error } = await api.PATCH("/tickets/{id}/assign", {
        params: { path: { id: ticketId } },
      });
      if (error) {
        throw new Error(`TicketsService.claim(${ticketId}): falha em PATCH /tickets/{id}/assign`, {
          cause: error,
        });
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      void qc.invalidateQueries({ queryKey: ["ticket-events", ticketId] });
    },
  });

  return {
    claim: (opts?: { onSuccess?: () => void }) => m.mutate(undefined, opts),
    isPending: m.isPending,
    isError: m.isError,
  };
}
```

- [ ] **Step 4: Rodar o teste, ver passar**

Run: `npx vitest run src/features/ticket-detail/useClaimTicket.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/ticket-detail/useClaimTicket.ts src/features/ticket-detail/useClaimTicket.test.tsx
git commit -m "feat(plan-6-5): useClaimTicket (PATCH /tickets/{id}/assign sem body)"
```

---

## Task 8.1: `useAssignTo` (PATCH /tickets/{id}/assign-to { assignee_id })

**Files:**

- Create: `src/features/ticket-detail/useAssignTo.ts`
- Test: `src/features/ticket-detail/useAssignTo.test.tsx`

(Mutation irmã de `useClaimTicket`, mas atribui a **outro** manager. Endpoint criado na Task 1.)

- [ ] **Step 1: Escrever o teste falhando**

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPatch } = vi.hoisted(() => ({ mockPatch: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { PATCH: mockPatch } }));

import { useAssignTo } from "./useAssignTo";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () => new QueryClient({ defaultOptions: { mutations: { retry: false } } });

afterEach(() => {
  mockPatch.mockReset();
  vi.restoreAllMocks();
});

describe("useAssignTo", () => {
  it("envia { assignee_id } e invalida ticket + events; chama onSuccess", async () => {
    mockPatch.mockResolvedValue({ data: { id: "t1" }, error: undefined });
    const qc = mkClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAssignTo("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.assignTo("u9", { onSuccess }));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    expect(mockPatch).toHaveBeenCalledWith("/tickets/{id}/assign-to", {
      params: { path: { id: "t1" } },
      body: { assignee_id: "u9" },
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket", "t1"] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket-events", "t1"] });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("expõe isError em falha", async () => {
    mockPatch.mockResolvedValue({ data: undefined, error: { message: "x" } });
    const { result } = renderHook(() => useAssignTo("t1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.assignTo("u9"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/ticket-detail/useAssignTo.test.tsx`
Expected: FAIL ("Cannot find module './useAssignTo'").

- [ ] **Step 3: Implementar**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export function useAssignTo(ticketId: string) {
  const qc = useQueryClient();
  const m = useMutation<void, Error, string>({
    mutationFn: async (assigneeId) => {
      const { error } = await api.PATCH("/tickets/{id}/assign-to", {
        params: { path: { id: ticketId } },
        body: { assignee_id: assigneeId },
      });
      if (error) {
        throw new Error(
          `TicketsService.assignTo(${ticketId}): falha em PATCH /tickets/{id}/assign-to`,
          {
            cause: error,
          },
        );
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      void qc.invalidateQueries({ queryKey: ["ticket-events", ticketId] });
    },
  });

  return {
    assignTo: (assigneeId: string, opts?: { onSuccess?: () => void }) => m.mutate(assigneeId, opts),
    isPending: m.isPending,
    isError: m.isError,
  };
}
```

- [ ] **Step 4: Rodar o teste, ver passar**

Run: `npx vitest run src/features/ticket-detail/useAssignTo.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/ticket-detail/useAssignTo.ts src/features/ticket-detail/useAssignTo.test.tsx
git commit -m "feat(plan-6-5): useAssignTo (PATCH /tickets/{id}/assign-to)"
```

---

## Task 8.2: `useCondoManagers` (GET /condos/{id}/managers)

**Files:**

- Create: `src/features/ticket-detail/useCondoManagers.ts`
- Test: `src/features/ticket-detail/useCondoManagers.test.tsx`

**Contexto:** lista managers/staff do condo com identidade resolvida. `name` pode vir `""` (Core resolve de `auth.users.raw_user_meta_data`, nem sempre presente) → expor um `label` email-first. Type guard valida cada item (tipagem honesta — payload gerado é tudo opcional).

- [ ] **Step 1: Escrever o teste falhando**

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { GET: mockGet } }));

import { useCondoManagers } from "./useCondoManagers";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

afterEach(() => {
  mockGet.mockReset();
  vi.restoreAllMocks();
});

describe("useCondoManagers", () => {
  it("mapeia itens válidos e deriva label email-first", async () => {
    mockGet.mockResolvedValue({
      data: [
        { user_id: "u1", email: "ana@ex.com", name: "Ana", role: "manager" },
        { user_id: "u2", email: "bob@ex.com", name: "", role: "staff" },
        { user_id: "bad", email: "", name: "", role: "manager" }, // sem user_id útil? mantém; mas role inválida abaixo filtra
      ],
      error: undefined,
    });
    const { result } = renderHook(() => useCondoManagers("c1"), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith("/condos/{id}/managers", {
      params: { path: { id: "c1" } },
    });
    expect(result.current.data?.[0]).toEqual({
      userId: "u1",
      email: "ana@ex.com",
      name: "Ana",
      role: "manager",
      label: "Ana",
    });
    expect(result.current.data?.[1]?.label).toBe("bob@ex.com"); // name vazio → email
  });

  it("descarta itens com role desconhecida", async () => {
    mockGet.mockResolvedValue({
      data: [{ user_id: "u1", email: "a@x.com", name: "A", role: "alien" }],
      error: undefined,
    });
    const { result } = renderHook(() => useCondoManagers("c1"), { wrapper: wrapper(mkClient()) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/ticket-detail/useCondoManagers.test.tsx`
Expected: FAIL ("Cannot find module './useCondoManagers'").

- [ ] **Step 3: Implementar**

```ts
import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Role } from "@/features/condo/roleHierarchy";

export interface CondoManager {
  userId: string;
  email: string;
  name: string;
  role: Role;
  /** Rótulo de exibição email-first: name quando houver, senão email. */
  label: string;
}

const ROLES: readonly string[] = ["viewer", "staff", "manager", "super_admin"];

function isRole(v: unknown): v is Role {
  return typeof v === "string" && ROLES.includes(v);
}

function toCondoManager(v: unknown): CondoManager | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.user_id !== "string" || !isRole(o.role)) return null;
  const email = typeof o.email === "string" ? o.email : "";
  const name = typeof o.name === "string" ? o.name : "";
  return { userId: o.user_id, email, name, role: o.role, label: name || email || o.user_id };
}

export function condoManagersQueryOptions(condoId: string) {
  return queryOptions({
    queryKey: ["condo-managers", condoId] as const,
    queryFn: async (): Promise<CondoManager[]> => {
      const { data, error } = await api.GET("/condos/{id}/managers", {
        params: { path: { id: condoId } },
      });
      if (error) {
        throw new Error(`ManagersService.list(${condoId}): falha em GET /condos/{id}/managers`, {
          cause: error,
        });
      }
      return (data ?? []).map(toCondoManager).filter((m): m is CondoManager => m !== null);
    },
    staleTime: 5 * 60_000,
  });
}

export function useCondoManagers(condoId: string) {
  return useQuery(condoManagersQueryOptions(condoId));
}
```

- [ ] **Step 4: Rodar o teste, ver passar**

Run: `npx vitest run src/features/ticket-detail/useCondoManagers.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/ticket-detail/useCondoManagers.ts src/features/ticket-detail/useCondoManagers.test.tsx
git commit -m "feat(plan-6-5): useCondoManagers (GET /condos/{id}/managers, email-first)"
```

---

## Task 9: `useAddComment` (POST /tickets/{id}/comments { text })

**Files:**

- Create: `src/features/ticket-detail/useAddComment.ts`
- Test: `src/features/ticket-detail/useAddComment.test.tsx`

- [ ] **Step 1: Escrever o teste falhando**

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { POST: mockPost } }));

import { useAddComment } from "./useAddComment";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = () => new QueryClient({ defaultOptions: { mutations: { retry: false } } });

afterEach(() => {
  mockPost.mockReset();
  vi.restoreAllMocks();
});

describe("useAddComment", () => {
  it("envia { text } e invalida events; chama onSuccess", async () => {
    mockPost.mockResolvedValue({
      data: { id: "e9", event_type: "comment_added" },
      error: undefined,
    });
    const qc = mkClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAddComment("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.addComment("olá mundo", { onSuccess }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost).toHaveBeenCalledWith("/tickets/{id}/comments", {
      params: { path: { id: "t1" } },
      body: { text: "olá mundo" },
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket-events", "t1"] });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("expõe isError em falha", async () => {
    mockPost.mockResolvedValue({ data: undefined, error: { message: "x" } });
    const { result } = renderHook(() => useAddComment("t1"), { wrapper: wrapper(mkClient()) });
    act(() => result.current.addComment("oi"));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/ticket-detail/useAddComment.test.tsx`
Expected: FAIL ("Cannot find module './useAddComment'").

- [ ] **Step 3: Implementar**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export function useAddComment(ticketId: string) {
  const qc = useQueryClient();
  // POST /tickets/{id}/comments body { text } (campo `text`, não `note`).
  // service.AddComment só persiste o evento — NÃO dispara notificação Telegram.
  const m = useMutation<void, Error, string>({
    mutationFn: async (text) => {
      const { error } = await api.POST("/tickets/{id}/comments", {
        params: { path: { id: ticketId } },
        body: { text },
      });
      if (error) {
        throw new Error(
          `TicketsService.addComment(${ticketId}): falha em POST /tickets/{id}/comments`,
          {
            cause: error,
          },
        );
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ticket-events", ticketId] }),
  });

  return {
    addComment: (text: string, opts?: { onSuccess?: () => void }) => m.mutate(text, opts),
    isPending: m.isPending,
    isError: m.isError,
  };
}
```

- [ ] **Step 4: Rodar o teste, ver passar**

Run: `npx vitest run src/features/ticket-detail/useAddComment.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/ticket-detail/useAddComment.ts src/features/ticket-detail/useAddComment.test.tsx
git commit -m "feat(plan-6-5): useAddComment (POST /tickets/{id}/comments)"
```

---

## Task 10: `TicketStatusControl` (segmented 4 status)

**Files:**

- Create: `src/features/ticket-detail/TicketStatusControl.tsx`
- Create: `src/features/ticket-detail/TicketStatusControl.module.css`
- Test: `src/features/ticket-detail/TicketStatusControl.test.tsx`

- [ ] **Step 1: Escrever o teste falhando**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketStatusControl } from "./TicketStatusControl";

describe("TicketStatusControl", () => {
  it("renderiza os 4 status com o atual marcado", () => {
    render(<TicketStatusControl status="in_progress" onChange={vi.fn()} disabled={false} />);
    expect(screen.getByRole("button", { name: "Aberto" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Em andamento" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("emite onChange ao clicar em outro status", async () => {
    const onChange = vi.fn();
    render(<TicketStatusControl status="open" onChange={onChange} disabled={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Resolvido" }));
    expect(onChange).toHaveBeenCalledWith("resolved");
  });

  it("não emite ao clicar no status já ativo", async () => {
    const onChange = vi.fn();
    render(<TicketStatusControl status="open" onChange={onChange} disabled={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Aberto" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("desabilita todos os botões quando disabled", () => {
    render(<TicketStatusControl status="open" onChange={vi.fn()} disabled={true} />);
    expect(screen.getByRole("button", { name: "Resolvido" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/ticket-detail/TicketStatusControl.test.tsx`
Expected: FAIL ("Cannot find module './TicketStatusControl'").

- [ ] **Step 3: Implementar o componente**

```tsx
import { TICKET_STATUSES, type TicketStatus } from "@/types/ticket";
import styles from "./TicketStatusControl.module.css";

interface TicketStatusControlProps {
  status: TicketStatus;
  onChange: (status: TicketStatus) => void;
  disabled: boolean;
}

const LABELS: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
};

export function TicketStatusControl({ status, onChange, disabled }: TicketStatusControlProps) {
  return (
    <div>
      <div className={styles.label}>Mudar status</div>
      <div className={styles.seg} role="group" aria-label="Mudar status do chamado">
        {TICKET_STATUSES.map((s) => {
          const active = s === status;
          return (
            <button
              key={s}
              type="button"
              className={[styles.segButton, active ? (styles.active ?? "") : ""]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={active}
              disabled={disabled}
              onClick={() => {
                if (!active) onChange(s);
              }}
            >
              {LABELS[s] ?? s}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Escrever o CSS Module**

(Adaptado de `.seg` no handoff `styles.css:953`.)

```css
.label {
  font-size: var(--fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-tertiary);
  font-weight: var(--fw-medium);
  margin-bottom: var(--space-2);
}
.seg {
  display: inline-flex;
  align-items: center;
  padding: 3px;
  background: var(--bg-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  gap: 2px;
}
.segButton {
  flex: 1;
  border: none;
  background: transparent;
  padding: var(--space-1) var(--space-3);
  border-radius: 5px;
  font-size: var(--fs-xs);
  font-weight: var(--fw-medium);
  color: var(--fg-tertiary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--easing-standard);
}
.segButton:hover:not(.active):not(:disabled) {
  color: var(--fg-secondary);
}
.segButton:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.active {
  background: var(--bg-surface);
  color: var(--fg-primary);
  box-shadow: var(--shadow-sm);
}
```

- [ ] **Step 5: Rodar o teste, ver passar**

Run: `npx vitest run src/features/ticket-detail/TicketStatusControl.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/ticket-detail/TicketStatusControl.*
git commit -m "feat(plan-6-5): TicketStatusControl (segmented 4 status)"
```

---

## Task 11: `TicketAssignControl` (assumir + atribuir a outro + responsável)

**Files:**

- Create: `src/features/ticket-detail/TicketAssignControl.tsx`
- Create: `src/features/ticket-detail/TicketAssignControl.module.css`
- Test: `src/features/ticket-detail/TicketAssignControl.test.tsx`

**Contexto:** componente apresentacional (sem hooks de dados — recebe tudo por prop, fácil de testar). Mostra:

- **Responsável atual**: resolve `assignedTo` (UUID) contra a lista `managers` → exibe `label` (email-first); se não estiver na lista, mostra "Atribuído" genérico; se vazio, "Não atribuído".
- **"Assumir ticket"** (self) → `onClaim()`.
- **Picker "Atribuir a outro"**: `<select>` com os managers (label email-first); ao escolher, `onAssignTo(userId)`. Não lista o próprio usuário logado (`currentUserId`) nem o responsável atual.
- Tudo escondido quando `canManage` é falso (mas o responsável continua visível como leitura).

- [ ] **Step 1: Escrever o teste falhando**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketAssignControl } from "./TicketAssignControl";
import type { CondoManager } from "./useCondoManagers";

const managers: CondoManager[] = [
  { userId: "me", email: "me@ex.com", name: "Eu", role: "manager", label: "Eu" },
  { userId: "ana", email: "ana@ex.com", name: "Ana", role: "manager", label: "Ana" },
  { userId: "bob", email: "bob@ex.com", name: "", role: "staff", label: "bob@ex.com" },
];

function setup(props: Partial<React.ComponentProps<typeof TicketAssignControl>> = {}) {
  return render(
    <TicketAssignControl
      assignedTo={undefined}
      managers={managers}
      currentUserId="me"
      canManage={true}
      isClaiming={false}
      isAssigning={false}
      onClaim={vi.fn()}
      onAssignTo={vi.fn()}
      {...props}
    />,
  );
}

describe("TicketAssignControl", () => {
  it("mostra 'Não atribuído' e botão Assumir quando vazio", () => {
    setup();
    expect(screen.getByText(/não atribuído/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /assumir ticket/i })).toBeInTheDocument();
  });

  it("resolve o responsável pelo label (email-first)", () => {
    setup({ assignedTo: "bob" });
    expect(screen.getByText("bob@ex.com")).toBeInTheDocument();
  });

  it("dispara onClaim ao assumir", async () => {
    const onClaim = vi.fn();
    setup({ onClaim });
    await userEvent.click(screen.getByRole("button", { name: /assumir ticket/i }));
    expect(onClaim).toHaveBeenCalled();
  });

  it("o picker exclui o próprio usuário e o responsável atual", () => {
    setup({ assignedTo: "ana" });
    const select = screen.getByRole("combobox", { name: /atribuir a outro/i });
    const optionValues = Array.from(select.querySelectorAll("option")).map((o) =>
      o.getAttribute("value"),
    );
    expect(optionValues).not.toContain("me"); // próprio
    expect(optionValues).not.toContain("ana"); // já responsável
    expect(optionValues).toContain("bob");
  });

  it("dispara onAssignTo ao escolher no picker", async () => {
    const onAssignTo = vi.fn();
    setup({ onAssignTo });
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /atribuir a outro/i }),
      "ana",
    );
    expect(onAssignTo).toHaveBeenCalledWith("ana");
  });

  it("esconde controles de escrita quando não pode gerenciar (mas mostra responsável)", () => {
    setup({ canManage: false, assignedTo: "ana" });
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /assumir ticket/i })).toBeNull();
    expect(screen.queryByRole("combobox", { name: /atribuir a outro/i })).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/ticket-detail/TicketAssignControl.test.tsx`
Expected: FAIL ("Cannot find module './TicketAssignControl'").

- [ ] **Step 3: Implementar**

```tsx
import { UserPlus } from "lucide-react";
import { Button } from "@/ui/Button/Button";
import type { CondoManager } from "./useCondoManagers";
import styles from "./TicketAssignControl.module.css";

interface TicketAssignControlProps {
  assignedTo: string | undefined;
  managers: CondoManager[];
  currentUserId: string | undefined;
  canManage: boolean;
  isClaiming: boolean;
  isAssigning: boolean;
  onClaim: () => void;
  onAssignTo: (userId: string) => void;
}

export function TicketAssignControl({
  assignedTo,
  managers,
  currentUserId,
  canManage,
  isClaiming,
  isAssigning,
  onClaim,
  onAssignTo,
}: TicketAssignControlProps) {
  const current = assignedTo ? managers.find((m) => m.userId === assignedTo) : undefined;
  const responsavel = assignedTo ? (current?.label ?? "Atribuído") : "Não atribuído";

  // Picker: exclui o próprio usuário e o responsável atual.
  const options = managers.filter((m) => m.userId !== currentUserId && m.userId !== assignedTo);

  return (
    <div className={styles.control}>
      <div className={styles.label}>Responsável</div>
      <div className={styles.current}>{responsavel}</div>
      {canManage && (
        <div className={styles.actions}>
          <Button variant="secondary" disabled={isClaiming} onClick={() => onClaim()}>
            <UserPlus size={14} aria-hidden="true" />
            {isClaiming ? "Assumindo…" : "Assumir ticket"}
          </Button>
          {options.length > 0 && (
            <select
              className={styles.picker}
              aria-label="Atribuir a outro manager"
              value=""
              disabled={isAssigning}
              onChange={(e) => {
                if (e.target.value) onAssignTo(e.target.value);
              }}
            >
              <option value="" disabled>
                {isAssigning ? "Atribuindo…" : "Atribuir a outro…"}
              </option>
              {options.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
```

> **Confirmar** que `lucide-react` exporta `UserPlus` na versão instalada: `node -e "const i=require('lucide-react'); console.log(!!i.UserPlus)"`. Se não, usar `User`.

- [ ] **Step 4: Escrever o CSS Module**

```css
.control {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 220px;
}
.label {
  font-size: var(--fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-tertiary);
  font-weight: var(--fw-medium);
}
.current {
  font-size: var(--fs-sm);
  color: var(--fg-primary);
  font-weight: var(--fw-medium);
}
.actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  align-items: center;
}
.picker {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  color: var(--fg-primary);
  font-size: var(--fs-sm);
}
```

- [ ] **Step 5: Rodar o teste, ver passar**

Run: `npx vitest run src/features/ticket-detail/TicketAssignControl.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/ticket-detail/TicketAssignControl.*
git commit -m "feat(plan-6-5): TicketAssignControl (assumir + picker + responsável)"
```

---

## Task 12: `TicketTimeline`

**Files:**

- Create: `src/features/ticket-detail/TicketTimeline.tsx`
- Create: `src/features/ticket-detail/TicketTimeline.module.css`
- Test: `src/features/ticket-detail/TicketTimeline.test.tsx`
- Create: `src/features/ticket-detail/TicketTimeline.stories.tsx`

- [ ] **Step 1: Escrever o teste falhando**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TicketTimeline } from "./TicketTimeline";
import { toTicketEvent, type TicketEvent } from "@/types/ticketEvent";

const comment = toTicketEvent({
  id: "e1",
  ticket_id: "t1",
  event_type: "comment_added",
  actor_type: "manager",
  created_at: "2026-05-20T10:00:00Z",
  payload: { text: "Equipe a caminho" },
}) as TicketEvent;

const statusEv = toTicketEvent({
  id: "e2",
  ticket_id: "t1",
  event_type: "status_changed",
  actor_type: "manager",
  created_at: "2026-05-20T09:00:00Z",
  payload: { from: "open", to: "in_progress" },
}) as TicketEvent;

describe("TicketTimeline", () => {
  it("mostra item created UI-only no topo", () => {
    render(<TicketTimeline events={[]} ticketCreatedAt="2026-05-20T08:00:00Z" />);
    expect(screen.getByText(/abriu o chamado/i)).toBeInTheDocument();
  });

  it("renderiza o corpo de um comentário", () => {
    render(<TicketTimeline events={[comment]} ticketCreatedAt="2026-05-20T08:00:00Z" />);
    expect(screen.getByText("Equipe a caminho")).toBeInTheDocument();
  });

  it("renderiza status_changed com badges from/to", () => {
    render(<TicketTimeline events={[statusEv]} ticketCreatedAt={undefined} />);
    expect(screen.getByText("Aberto")).toBeInTheDocument();
    expect(screen.getByText("Em andamento")).toBeInTheDocument();
  });

  it("usa label por actor_type (sem fabricar nome)", () => {
    render(<TicketTimeline events={[comment]} ticketCreatedAt={undefined} />);
    expect(screen.getByText("Gestor")).toBeInTheDocument();
  });

  it("empty state quando não há nada", () => {
    render(<TicketTimeline events={[]} ticketCreatedAt={undefined} />);
    expect(screen.getByText(/sem eventos/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/ticket-detail/TicketTimeline.test.tsx`
Expected: FAIL ("Cannot find module './TicketTimeline'").

- [ ] **Step 3: Implementar**

```tsx
import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { formatRelTime } from "@/lib/formatRelTime";
import {
  buildTimeline,
  commentText,
  statusChange,
  type TicketActorType,
  type TicketEvent,
  type TimelineItem,
} from "@/types/ticketEvent";
import styles from "./TicketTimeline.module.css";

interface TicketTimelineProps {
  events: TicketEvent[];
  ticketCreatedAt: string | undefined;
}

const ACTOR_LABEL: Record<TicketActorType, string> = {
  manager: "Gestor",
  resident: "Morador",
  system: "Sistema",
};

// classe da dot por kind (created/assigned = info; status = brand; comment = neutra)
const DOT_CLASS: Record<TimelineItem["kind"], string> = {
  created: styles.dotSystem ?? "",
  assigned: styles.dotAssign ?? "",
  status_changed: styles.dotStatus ?? "",
  comment_added: styles.dotComment ?? "",
};

function actorLabel(item: TimelineItem): string {
  if (item.kind === "created") return "Sistema";
  return ACTOR_LABEL[item.event.actorType] ?? "Sistema";
}

function ActionText({ item }: { item: TimelineItem }) {
  if (item.kind === "created") return <span>abriu o chamado</span>;
  if (item.kind === "assigned") return <span>assumiu o chamado</span>;
  if (item.kind === "comment_added") return <span>comentou</span>;
  const change = statusChange(item.event);
  if (!change) return <span>mudou o status</span>;
  return (
    <span className={styles.statusAction}>
      {change.from ? (
        <>
          mudou de <StatusBadge status={change.from} /> para <StatusBadge status={change.to} />
        </>
      ) : (
        <>
          mudou para <StatusBadge status={change.to} />
        </>
      )}
    </span>
  );
}

export function TicketTimeline({ events, ticketCreatedAt }: TicketTimelineProps) {
  const items = buildTimeline(events, ticketCreatedAt);
  if (items.length === 0) {
    return <div className={styles.empty}>Sem eventos ainda.</div>;
  }
  return (
    <div className={styles.timeline}>
      {items.map((item) => {
        const body = item.kind === "comment_added" ? commentText(item.event) : null;
        return (
          <div key={item.id} className={styles.item}>
            <span
              className={[styles.dot, DOT_CLASS[item.kind]].filter(Boolean).join(" ")}
              aria-hidden="true"
            />
            <div className={styles.head}>
              <span className={styles.author}>{actorLabel(item)}</span>
              <span className={styles.action}>
                <ActionText item={item} />
              </span>
              <span className={styles.time}>{formatRelTime(item.at)}</span>
            </div>
            {body && <div className={styles.body}>{body}</div>}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Escrever o CSS Module**

(Adaptado de `.timeline`/`.tl-*` no handoff `styles.css:1020-1105`.)

```css
.timeline {
  position: relative;
  padding-left: var(--space-8);
}
.timeline::before {
  content: "";
  position: absolute;
  left: 11px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--border);
}
.item {
  position: relative;
  padding-bottom: var(--space-5);
}
.item:last-child {
  padding-bottom: 0;
}
.dot {
  position: absolute;
  left: calc(-1 * var(--space-8) + 2px);
  top: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--bg-surface);
  border: 2px solid var(--border);
}
.dotStatus {
  background: var(--brand-soft);
  border-color: var(--brand);
}
.dotAssign {
  background: var(--info-bg);
  border-color: var(--info-fg);
}
.dotSystem {
  background: var(--bg-surface);
  border-color: var(--border-strong);
}
.dotComment {
  background: var(--bg-surface);
  border-color: var(--border-strong);
}
.head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  font-size: var(--fs-sm);
}
.author {
  font-weight: var(--fw-semibold);
  color: var(--fg-primary);
}
.action {
  color: var(--fg-secondary);
}
.statusAction {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  flex-wrap: wrap;
}
.time {
  margin-left: auto;
  font-size: var(--fs-xs);
  color: var(--fg-tertiary);
  font-family: var(--font-mono);
}
.body {
  margin-top: var(--space-2);
  font-size: var(--fs-sm);
  color: var(--fg-secondary);
  padding: var(--space-3);
  background: var(--bg-muted);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  line-height: var(--lh-relaxed);
}
.empty {
  font-size: var(--fs-sm);
  color: var(--fg-tertiary);
  padding: var(--space-4) 0;
}
```

> Se algum token (`--brand-soft`, `--info-bg`, `--info-fg`, `--border-strong`) não existir em `src/design-tokens/`, conferir o nome real e ajustar. `stylelint` (strict-value) falha em valor cru.

- [ ] **Step 5: Rodar o teste, ver passar**

Run: `npx vitest run src/features/ticket-detail/TicketTimeline.test.tsx`
Expected: PASS.

- [ ] **Step 6: Storybook story**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { TicketTimeline } from "./TicketTimeline";
import { toTicketEvent, type TicketEvent } from "@/types/ticketEvent";

const events = [
  toTicketEvent({
    id: "e1",
    ticket_id: "t1",
    event_type: "status_changed",
    actor_type: "manager",
    created_at: "2026-05-20T09:00:00Z",
    payload: { from: "open", to: "in_progress" },
  }),
  toTicketEvent({
    id: "e2",
    ticket_id: "t1",
    event_type: "assigned",
    actor_type: "manager",
    created_at: "2026-05-20T09:05:00Z",
    payload: {},
  }),
  toTicketEvent({
    id: "e3",
    ticket_id: "t1",
    event_type: "comment_added",
    actor_type: "manager",
    created_at: "2026-05-20T10:00:00Z",
    payload: { text: "Equipe a caminho, chega em 30 min." },
  }),
].filter((e): e is TicketEvent => e !== null);

const meta: Meta<typeof TicketTimeline> = {
  title: "TicketDetail/TicketTimeline",
  component: TicketTimeline,
};
export default meta;
type Story = StoryObj<typeof TicketTimeline>;

export const Default: Story = { args: { events, ticketCreatedAt: "2026-05-20T08:00:00Z" } };
export const Empty: Story = { args: { events: [], ticketCreatedAt: undefined } };
```

- [ ] **Step 7: Commit**

```bash
git add src/features/ticket-detail/TicketTimeline.*
git commit -m "feat(plan-6-5): TicketTimeline (eventos do Core + item created UI-only)"
```

---

## Task 13: `TicketComposer`

**Files:**

- Create: `src/features/ticket-detail/TicketComposer.tsx`
- Create: `src/features/ticket-detail/TicketComposer.module.css`
- Test: `src/features/ticket-detail/TicketComposer.test.tsx`

**Contexto:** textarea + footer com "Publicar" (disabled quando vazio ou pending). **Sem** aviso de Telegram (comentário não notifica). Limpa o textarea após sucesso — o `TicketComposer` controla o próprio state e chama `onSubmit(text, { onClear })`; o pai dispara a mutation e o componente limpa no `onSuccess`.

- [ ] **Step 1: Escrever o teste falhando**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketComposer } from "./TicketComposer";

describe("TicketComposer", () => {
  it("desabilita Publicar quando vazio", () => {
    render(<TicketComposer onSubmit={vi.fn()} isPending={false} />);
    expect(screen.getByRole("button", { name: /publicar/i })).toBeDisabled();
  });

  it("habilita ao digitar e chama onSubmit com o texto", async () => {
    const onSubmit = vi.fn();
    render(<TicketComposer onSubmit={onSubmit} isPending={false} />);
    await userEvent.type(screen.getByRole("textbox"), "Olá");
    const btn = screen.getByRole("button", { name: /publicar/i });
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    expect(onSubmit).toHaveBeenCalledWith(
      "Olá",
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("limpa o textarea quando o pai chama onSuccess", async () => {
    const onSubmit = vi.fn((_text: string, opts: { onSuccess: () => void }) => opts.onSuccess());
    render(<TicketComposer onSubmit={onSubmit} isPending={false} />);
    const textarea = screen.getByRole("textbox");
    await userEvent.type(textarea, "Some texto");
    await userEvent.click(screen.getByRole("button", { name: /publicar/i }));
    expect(textarea).toHaveValue("");
  });

  it("não tem menção a Telegram", () => {
    render(<TicketComposer onSubmit={vi.fn()} isPending={false} />);
    expect(screen.queryByText(/telegram/i)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/ticket-detail/TicketComposer.test.tsx`
Expected: FAIL ("Cannot find module './TicketComposer'").

- [ ] **Step 3: Implementar**

```tsx
import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/ui/Button/Button";
import styles from "./TicketComposer.module.css";

interface TicketComposerProps {
  onSubmit: (text: string, opts: { onSuccess: () => void }) => void;
  isPending: boolean;
}

export function TicketComposer({ onSubmit, isPending }: TicketComposerProps) {
  const [text, setText] = useState("");
  const trimmed = text.trim();

  function handlePublish() {
    if (!trimmed) return;
    onSubmit(trimmed, { onSuccess: () => setText("") });
  }

  return (
    <div className={styles.composer}>
      <textarea
        className={styles.textarea}
        placeholder="Adicionar comentário…"
        aria-label="Adicionar comentário"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isPending}
      />
      <div className={styles.footer}>
        <Button size="sm" disabled={!trimmed || isPending} onClick={handlePublish}>
          <Send size={12} aria-hidden="true" />
          {isPending ? "Publicando…" : "Publicar"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Escrever o CSS Module**

(Adaptado de `.composer` no handoff `styles.css:1108`.)

```css
.composer {
  margin-top: var(--space-4);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  overflow: hidden;
}
.textarea {
  width: 100%;
  border: 0;
  padding: var(--space-3) var(--space-4);
  resize: none;
  outline: 0;
  font-size: var(--fs-sm);
  min-height: 72px;
  background: transparent;
  color: var(--fg-primary);
  font-family: inherit;
}
.footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--border);
  background: var(--bg-muted);
}
```

- [ ] **Step 5: Rodar o teste, ver passar**

Run: `npx vitest run src/features/ticket-detail/TicketComposer.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/ticket-detail/TicketComposer.*
git commit -m "feat(plan-6-5): TicketComposer (sem aviso Telegram)"
```

---

## Task 14: `TicketDetailPage` (composição)

**Files:**

- Create: `src/features/ticket-detail/TicketDetailPage.tsx`
- Create: `src/features/ticket-detail/TicketDetailPage.module.css`
- Test: `src/features/ticket-detail/TicketDetailPage.test.tsx`

**Props:** `{ condoId: string; ticketId: string; onClose: () => void }`. Compõe `useTicket` + `useTicketEvents` + `useCondoManagers` + as 4 mutations (`useUpdateStatus`/`useClaimTicket`/`useAssignTo`/`useAddComment`) + `useCanManageTicket` + `currentUserId` (da sessão). Estados: loading (Spinner), erro (mensagem + "Tentar novamente"), sucesso (header + chips + meta + status control + assign control + descrição + timeline + composer). Controles de escrita só quando `canManage`.

- [ ] **Step 1: Escrever o teste falhando**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  mockUseTicket,
  mockUseTicketEvents,
  mockUseUpdateStatus,
  mockUseClaim,
  mockUseAssignTo,
  mockUseCondoManagers,
  mockUseAddComment,
  mockUseCanManage,
  mockUseSession,
} = vi.hoisted(() => ({
  mockUseTicket: vi.fn(),
  mockUseTicketEvents: vi.fn(),
  mockUseUpdateStatus: vi.fn(),
  mockUseClaim: vi.fn(),
  mockUseAssignTo: vi.fn(),
  mockUseCondoManagers: vi.fn(),
  mockUseAddComment: vi.fn(),
  mockUseCanManage: vi.fn(),
  mockUseSession: vi.fn(),
}));
vi.mock("@/features/tickets/useTicket", () => ({ useTicket: mockUseTicket }));
vi.mock("./useTicketEvents", () => ({ useTicketEvents: mockUseTicketEvents }));
vi.mock("./useUpdateStatus", () => ({ useUpdateStatus: mockUseUpdateStatus }));
vi.mock("./useClaimTicket", () => ({ useClaimTicket: mockUseClaim }));
vi.mock("./useAssignTo", () => ({ useAssignTo: mockUseAssignTo }));
vi.mock("./useCondoManagers", () => ({ useCondoManagers: mockUseCondoManagers }));
vi.mock("./useAddComment", () => ({ useAddComment: mockUseAddComment }));
vi.mock("@/features/tickets/useCanManageTicket", () => ({ useCanManageTicket: mockUseCanManage }));
vi.mock("@/stores/session", () => ({ useSessionStore: mockUseSession }));

import { TicketDetailPage } from "./TicketDetailPage";

const TICKET = {
  id: "t1",
  protocol: "TKT-2026-0001",
  title: "Vazamento na garagem",
  status: "open",
  priority: "high",
  resident_name: "Maria",
  common_area_name: "Garagem",
  description: "Água acumulando",
  created_at: "2026-05-20T08:00:00Z",
  updated_at: "2026-05-20T10:00:00Z",
};

beforeEach(() => {
  mockUseTicket.mockReturnValue({
    data: TICKET,
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  });
  mockUseTicketEvents.mockReturnValue({ data: [] });
  mockUseUpdateStatus.mockReturnValue({
    updateStatus: vi.fn(),
    pendingStatus: undefined,
    isError: false,
  });
  mockUseClaim.mockReturnValue({ claim: vi.fn(), isPending: false, isError: false });
  mockUseAssignTo.mockReturnValue({ assignTo: vi.fn(), isPending: false, isError: false });
  mockUseCondoManagers.mockReturnValue({ data: [] });
  mockUseAddComment.mockReturnValue({ addComment: vi.fn(), isPending: false, isError: false });
  mockUseCanManage.mockReturnValue(true);
  // useSessionStore(selector) → aplica o selector a um state fake com user id
  mockUseSession.mockImplementation((sel: (s: unknown) => unknown) =>
    sel({ session: { user: { id: "me" } } }),
  );
});

describe("TicketDetailPage", () => {
  it("renderiza header, protocolo, status control e composer (manager)", () => {
    render(<TicketDetailPage condoId="c1" ticketId="t1" onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Vazamento na garagem" })).toBeInTheDocument();
    expect(screen.getByText("TKT-2026-0001")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /mudar status/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /assumir ticket/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("esconde controles de escrita quando não pode gerenciar", () => {
    mockUseCanManage.mockReturnValue(false);
    render(<TicketDetailPage condoId="c1" ticketId="t1" onClose={vi.fn()} />);
    expect(screen.queryByRole("group", { name: /mudar status/i })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("chama updateStatus ao clicar num status", async () => {
    const updateStatus = vi.fn();
    mockUseUpdateStatus.mockReturnValue({ updateStatus, pendingStatus: undefined, isError: false });
    render(<TicketDetailPage condoId="c1" ticketId="t1" onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Resolvido" }));
    expect(updateStatus).toHaveBeenCalledWith("resolved");
  });

  it("atribui a outro manager pelo picker", async () => {
    const assignTo = vi.fn();
    mockUseAssignTo.mockReturnValue({ assignTo, isPending: false, isError: false });
    mockUseCondoManagers.mockReturnValue({
      data: [
        { userId: "me", email: "me@ex.com", name: "Eu", role: "manager", label: "Eu" },
        { userId: "ana", email: "ana@ex.com", name: "Ana", role: "manager", label: "Ana" },
      ],
    });
    render(<TicketDetailPage condoId="c1" ticketId="t1" onClose={vi.fn()} />);
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /atribuir a outro/i }),
      "ana",
    );
    expect(assignTo).toHaveBeenCalledWith("ana");
  });

  it("fecha ao clicar no botão de fechar", async () => {
    const onClose = vi.fn();
    render(<TicketDetailPage condoId="c1" ticketId="t1" onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /fechar/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("mostra loading", () => {
    mockUseTicket.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      isFetching: true,
      refetch: vi.fn(),
    });
    render(<TicketDetailPage condoId="c1" ticketId="t1" onClose={vi.fn()} />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it("mostra erro com tentar novamente", () => {
    mockUseTicket.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      isFetching: false,
      refetch: vi.fn(),
    });
    render(<TicketDetailPage condoId="c1" ticketId="t1" onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste, ver falhar**

Run: `npx vitest run src/features/ticket-detail/TicketDetailPage.test.tsx`
Expected: FAIL ("Cannot find module './TicketDetailPage'").

- [ ] **Step 3: Implementar**

```tsx
import { X } from "lucide-react";
import { Spinner } from "@/ui/Spinner/Spinner";
import { Button } from "@/ui/Button/Button";
import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { PriorityChip } from "@/ui/PriorityChip/PriorityChip";
import { useTicket } from "@/features/tickets/useTicket";
import { useCanManageTicket } from "@/features/tickets/useCanManageTicket";
import { useSessionStore } from "@/stores/session";
import { formatRelTime } from "@/lib/formatRelTime";
import { formatFullTime } from "@/lib/formatFullTime";
import type { Ticket } from "@/types/ticket";
import { useTicketEvents } from "./useTicketEvents";
import { useUpdateStatus } from "./useUpdateStatus";
import { useClaimTicket } from "./useClaimTicket";
import { useAssignTo } from "./useAssignTo";
import { useCondoManagers } from "./useCondoManagers";
import { useAddComment } from "./useAddComment";
import { TicketStatusControl } from "./TicketStatusControl";
import { TicketAssignControl } from "./TicketAssignControl";
import { TicketTimeline } from "./TicketTimeline";
import { TicketComposer } from "./TicketComposer";
import styles from "./TicketDetailPage.module.css";

interface TicketDetailPageProps {
  condoId: string;
  ticketId: string;
  onClose: () => void;
}

function locationLabel(t: Ticket): string {
  if (t.common_area_name) return t.common_area_name;
  if (t.block_name && t.unit_number) return `${t.block_name} · ${t.unit_number}`;
  if (t.unit_number) return t.unit_number;
  return "—";
}

export function TicketDetailPage({ condoId, ticketId, onClose }: TicketDetailPageProps) {
  const { data, isPending, isFetching, isError, refetch } = useTicket(ticketId);
  const { data: events } = useTicketEvents(ticketId);
  const { data: managers } = useCondoManagers(condoId);
  const canManage = useCanManageTicket(condoId);
  const currentUserId = useSessionStore((s) => s.session?.user?.id);
  const { updateStatus, pendingStatus } = useUpdateStatus(ticketId);
  const { claim, isPending: claiming } = useClaimTicket(ticketId);
  const { assignTo, isPending: assigning } = useAssignTo(ticketId);
  const { addComment, isPending: commenting } = useAddComment(ticketId);

  if (isPending) {
    return (
      <div className={styles.center}>
        <Spinner />
        <p>Carregando chamado…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.center}>
        <h3>Não conseguimos abrir esse chamado</h3>
        <p>Pode ter sido removido ou você não tem acesso a ele.</p>
        <div className={styles.errorActions}>
          <Button variant="secondary" onClick={() => onClose()}>
            Voltar para chamados
          </Button>
          <Button
            onClick={() => {
              void refetch();
            }}
            disabled={isFetching}
          >
            {isFetching ? "Tentando…" : "Tentar novamente"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headTop}>
          <div>
            <div className={styles.proto}>{data.protocol}</div>
            <h1 className={styles.title}>{data.title}</h1>
          </div>
          <Button variant="ghost" aria-label="Fechar chamado" onClick={() => onClose()}>
            <X size={16} aria-hidden="true" />
          </Button>
        </div>
        <div className={styles.chips}>
          <StatusBadge status={data.status} />
          <PriorityChip priority={data.priority} />
          <span className={styles.locChip}>{locationLabel(data)}</span>
        </div>
        <div className={styles.meta}>
          {data.resident_name && (
            <span>
              <span className={styles.metaLabel}>Morador:</span> {data.resident_name}
            </span>
          )}
          <span>
            <span className={styles.metaLabel}>Aberto em:</span> {formatFullTime(data.created_at)}
          </span>
          <span>
            <span className={styles.metaLabel}>Atualizado:</span> {formatRelTime(data.updated_at)}
          </span>
        </div>
      </header>

      <div className={styles.actions}>
        {canManage && (
          <TicketStatusControl
            status={data.status}
            onChange={(s) => updateStatus(s)}
            disabled={pendingStatus !== undefined}
          />
        )}
        <TicketAssignControl
          assignedTo={data.assigned_to}
          managers={managers ?? []}
          currentUserId={currentUserId}
          canManage={canManage}
          isClaiming={claiming}
          isAssigning={assigning}
          onClaim={() => claim()}
          onAssignTo={(userId) => assignTo(userId)}
        />
      </div>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Descrição</div>
        <div className={styles.description}>{data.description ?? "Sem descrição."}</div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Timeline</div>
        <TicketTimeline events={events ?? []} ticketCreatedAt={data.created_at} />
      </section>

      {canManage && (
        <section className={styles.section}>
          <TicketComposer
            onSubmit={(text, opts) => addComment(text, opts)}
            isPending={commenting}
          />
        </section>
      )}
    </article>
  );
}
```

- [ ] **Step 4: Escrever o CSS Module**

```css
.page {
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-4);
  text-align: center;
  color: var(--fg-secondary);
}
.errorActions {
  display: flex;
  gap: var(--space-3);
}
.header {
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border);
}
.headTop {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.proto {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--fg-tertiary);
  margin-bottom: var(--space-1);
}
.title {
  margin: 0;
  font-size: var(--fs-xl);
  font-weight: var(--fw-semibold);
  color: var(--fg-primary);
  line-height: var(--lh-snug);
}
.chips {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  align-items: center;
}
.locChip {
  font-size: var(--fs-xs);
  color: var(--fg-secondary);
  padding: 2px var(--space-2);
  background: var(--bg-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-3);
  font-size: var(--fs-xs);
  color: var(--fg-secondary);
}
.metaLabel {
  color: var(--fg-tertiary);
  margin-right: 3px;
}
.actions {
  display: flex;
  gap: var(--space-5);
  flex-wrap: wrap;
  align-items: flex-end;
  padding: var(--space-4);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}
.section {
  display: flex;
  flex-direction: column;
}
.sectionTitle {
  font-size: var(--fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-tertiary);
  font-weight: var(--fw-medium);
  margin-bottom: var(--space-3);
}
.description {
  font-size: var(--fs-sm);
  color: var(--fg-secondary);
  line-height: var(--lh-relaxed);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-muted);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}
```

> Conferir `--radius-sm` em tokens; se não existir, usar `--radius-md`.

- [ ] **Step 5: Rodar o teste, ver passar**

Run: `npx vitest run src/features/ticket-detail/TicketDetailPage.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/ticket-detail/TicketDetailPage.*
git commit -m "feat(plan-6-5): TicketDetailPage (composição)"
```

---

## Task 15: Rota page-level + redirect da rota antiga + deletar modal/inbox

**Files:**

- Modify: `src/app/routes/_app/c/$condoId/tickets/$ticketId.tsx`
- Modify: `src/app/routes/_app/c/$condoId/inbox/$ticketId.tsx`
- Delete: `src/features/inbox/TicketDetailModal.tsx`, `.test.tsx`, `.module.css`
- Delete (dir): `src/features/inbox/` (vazio após a Task 2 ter movido `useTicket`)

- [ ] **Step 1: Plugar a `TicketDetailPage` na rota de detalhe**

Substituir `src/app/routes/_app/c/$condoId/tickets/$ticketId.tsx`:

```tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TicketDetailPage } from "@/features/ticket-detail/TicketDetailPage";

export const Route = createFileRoute("/_app/c/$condoId/tickets/$ticketId")({
  component: TicketDetailRoute,
});

function TicketDetailRoute() {
  const { condoId, ticketId } = Route.useParams();
  const navigate = useNavigate();
  return (
    <TicketDetailPage
      condoId={condoId}
      ticketId={ticketId}
      onClose={() => {
        void navigate({ to: "/c/$condoId/tickets", params: { condoId } });
      }}
    />
  );
}
```

- [ ] **Step 2: Transformar a rota antiga `inbox/$ticketId` em redirect**

Substituir `src/app/routes/_app/c/$condoId/inbox/$ticketId.tsx` por um `beforeLoad` que faz `throw redirect` (sem componente que rerenderiza — não dispara fetch da rota antiga ao hover com `defaultPreload: "intent"`):

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/c/$condoId/inbox/$ticketId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/c/$condoId/tickets/$ticketId",
      params: { condoId: params.condoId, ticketId: params.ticketId },
      replace: true,
    });
  },
});
```

> **Deep-links externos (follow-up de release, não desta Slice):** antes de remover a rota `inbox/$ticketId` definitivamente, migrar URLs do bot Telegram e templates de email no Core (`core/internal/adapters/notifier/*`). Registrar como item no PR. Esta Slice mantém o redirect como ponte.

- [ ] **Step 3: Deletar o modal Plan-4 e a pasta `features/inbox/`**

```bash
git rm src/features/inbox/TicketDetailModal.tsx \
       src/features/inbox/TicketDetailModal.test.tsx \
       src/features/inbox/TicketDetailModal.module.css
rmdir src/features/inbox 2>/dev/null || true
```

- [ ] **Step 4: Confirmar que nada mais importa o modal/inbox**

Run: `grep -rn "features/inbox" src/ ; echo "exit: $?"`
Expected: nenhuma linha (grep sai com 1). Se aparecer algo, corrigir o import antes de seguir.

- [ ] **Step 5: Regenerar `routeTree.gen.ts`**

```bash
npm run dev &  DEV_PID=$!
sleep 8
kill $DEV_PID
```

Conferir que `git status` mostra `routeTree.gen.ts` modificado (rota `tickets/$ticketId` com componente real; `inbox/$ticketId` ainda registrada como rota de redirect).

- [ ] **Step 6: Typecheck + testes do feature**

Run: `npm run typecheck && npx vitest run src/features/ticket-detail src/features/tickets`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(plan-6-5): rota page-level tickets/\$ticketId + redirect inbox + remove modal"
```

---

## Task 16: Repontar o clique de ticket das overviews

**Files:**

- Modify: `src/features/overview/OverviewPage.tsx:45-47`
- Modify: `src/features/overview/CondoOverviewPage.tsx:35-36`
- Modify: `src/features/overview/OverviewPage.test.tsx`
- Modify: `src/features/overview/CondoOverviewPage.test.tsx`

**Contexto (decisão 2026-05-22):** hoje `pickTicket` navega para `/c/$condoId/inbox/$ticketId` (abre o modal sobre o feed). Trocar para `/c/$condoId/tickets/$ticketId` — lar canônico do ticket, com close → `/c/<id>/tickets`. Sem isso, quem vem da overview fica preso no inbox ao fechar.

- [ ] **Step 1: Atualizar o teste da `OverviewPage` (rota nova)**

Em `src/features/overview/OverviewPage.test.tsx`, localizar a asserção do `mockNavigate` para `/c/$condoId/inbox/$ticketId` e trocar o `to` esperado para `/c/$condoId/tickets/$ticketId` (params `{ condoId, ticketId }` permanecem).

- [ ] **Step 2: Atualizar o teste da `CondoOverviewPage` (rota nova)**

Mesmo ajuste em `src/features/overview/CondoOverviewPage.test.tsx`.

- [ ] **Step 3: Rodar os testes, ver falhar**

Run: `npx vitest run src/features/overview/OverviewPage.test.tsx src/features/overview/CondoOverviewPage.test.tsx`
Expected: FAIL (asserções esperam a rota nova; o código ainda navega para `inbox`).

- [ ] **Step 4: Repontar `pickTicket` na `OverviewPage`**

Em `src/features/overview/OverviewPage.tsx`, na função `pickTicket`, trocar a navegação:

```tsx
void navigate({ to: "/c/$condoId/tickets/$ticketId", params: { condoId, ticketId } });
```

- [ ] **Step 5: Repontar `pickTicket` na `CondoOverviewPage`**

Em `src/features/overview/CondoOverviewPage.tsx`:

```tsx
void navigate({ to: "/c/$condoId/tickets/$ticketId", params: { condoId: cId, ticketId } });
```

- [ ] **Step 6: Rodar os testes, ver passar**

Run: `npx vitest run src/features/overview/OverviewPage.test.tsx src/features/overview/CondoOverviewPage.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/overview/OverviewPage.tsx src/features/overview/CondoOverviewPage.tsx \
        src/features/overview/OverviewPage.test.tsx src/features/overview/CondoOverviewPage.test.tsx
git commit -m "feat(plan-6-5): overview navega ticket para /c/\$id/tickets/\$ticketId"
```

---

## Task 17: Verificação final + Storybook + PR

**Files:** nenhum novo.

- [ ] **Step 1: Lint + typecheck + testes + build**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: tudo verde. Resolver qualquer falha antes de seguir.

- [ ] **Step 2: Simular CI sem `.env.local`**

(Vite carrega `.env.local` mesmo com `env -u`; renomear reproduz o CI — convenção do projeto.)

```bash
mv .env.local .env.local.bak
npm run test
mv .env.local.bak .env.local
```

Expected: testes verdes sem `.env.local` (hooks que tocam `@/api/client` estão mockados com `vi.mock`).

- [ ] **Step 3: Storybook (smoke)**

Run: `npm run storybook` (subir, conferir `TicketDetail/TicketTimeline` → `Default` e `Empty`, depois matar o processo).

- [ ] **Step 4: Smoke manual no app**

```bash
npm run dev
```

Conferir, logado como manager num condo:

- `/c/<id>/tickets/<ticketId>` renderiza header, status control, controle de atribuição, timeline, composer.
- Clicar num status muda e o evento aparece na timeline (após refetch).
- "Assumir ticket" → responsável passa a exibir você (label email-first) + evento `assigned` na timeline.
- Picker "Atribuir a outro…" lista os managers do condo (nome quando houver, senão email), exclui você e o responsável atual; escolher um → responsável muda + evento `assigned`.
- Publicar comentário → aparece `comment_added` com o texto; textarea limpa.
- Abrir `/c/<id>/inbox/<ticketId>` redireciona para `/c/<id>/tickets/<ticketId>`.
- Da Overview, clicar em "Atividade recente" abre a página de detalhe; fechar volta para `/c/<id>/tickets`.
- Logado como viewer: sem status control / botão assumir / picker / composer; **responsável (leitura)**, timeline e descrição visíveis.

Matar o `npm run dev` (`kill %1` ou Ctrl-C) — processo órfão regenera `routeTree.gen.ts` e trava `git`.

- [ ] **Step 5: Push + abrir PR**

Usar a skill `pr`. Na descrição incluir:

- Resumo da Slice 6.5 (página de detalhe substitui o modal).
- Checklist de regressão funcional (status/claim/composer/redirect/overview).
- **Dependência:** linkar o PR do Core (Task 1: `assign-to` + `GET /condos/{id}/managers` + `IdentityResolver`). Mencionar que requer `GRANT SELECT` em `auth.users` para o role do Core em produção.
- **Follow-ups:** (1) nome de **autor** na timeline (hoje label por `actor_type`) — agora barato com o `IdentityResolver`; (2) migração de deep-links externos (Telegram/email) antes de remover a rota `inbox/$ticketId`; (3) avaliar mover a resolução de identidade para o token JWT (evitar 1 query a `auth.users` por listagem) se virar gargalo.
- Desvios conscientes do handoff (sem categoria, sem telefone, sem aviso Telegram, label de autor por `actor_type`).

```bash
git push -u origin feature/plan-6-5-ticket-detail
```

- [ ] **Step 6: Atualizar `CLAUDE.md` "Estado atual" (no PR ou follow-up de merge)**

Após merge, atualizar a seção "Estado atual do projeto" do `CLAUDE.md` (snapshot enxuto): mencionar a página de detalhe de ticket e a remoção do modal Plan-4. Adicionar "Lições" só se o review revelar convenção nova.

---

## Acceptance (espelha o appendix do Plan 6)

- [ ] `/c/<id>/tickets/<ticketId>` renderiza página completa (header, status control, controle de atribuição, timeline, composer).
- [ ] Mudança de status atualiza UI e adiciona evento na timeline (invalidate + refetch).
- [ ] "Assumir ticket" dispara `PATCH /tickets/{id}/assign` (sem body); evento `assigned` na timeline; responsável passa a exibir o usuário.
- [ ] Picker "Atribuir a outro" dispara `PATCH /tickets/{id}/assign-to { assignee_id }`; lista managers do condo (label email-first), exclui self e responsável atual; evento `assigned`.
- [ ] Responsável resolvido pelo nome/email via `GET /condos/{id}/managers` (não UUID cru).
- [ ] Composer publica comentário (body `{ text }`) → evento `comment_added` com `payload.text`; textarea limpa após sucesso.
- [ ] Modal Plan-4 removido; `features/inbox/` deletada.
- [ ] `inbox/$ticketId` redireciona para `tickets/$ticketId` (via `beforeLoad`).
- [ ] Clique em "Atividade recente" nas duas overviews navega para `/c/<id>/tickets/<ticketId>`; fechar volta para `/c/<id>/tickets`.
- [ ] Controles de escrita gated por role (≥ staff) na UI, além do `beforeLoad`; responsável visível em leitura para viewer.
- [ ] **Task 1 (gate) concluída:** `assign-to` + `GET /condos/{id}/managers` + `IdentityResolver` implementados e **mergeados** no Core; grant `auth.users` validado; tipos do dashboard regenerados (`assign-to` e `condos/{id}/managers` em `src/api/types.ts`).
- [ ] Lint/typecheck/test/build verdes (incl. simulação sem `.env.local`).
- [ ] `routeTree.gen.ts` regenerado e commitado.

---

## Self-review

**Spec coverage (vs item 1–7 do appendix):**

1. Rota page-level + redirect da antiga via `beforeLoad`/`throw redirect` → Task 15. Deep-links externos anotados como follow-up.
2. Header (protocolo + condo/título + close + chips + meta) → Task 14. (Condo name não vem em `TicketResponse`; o header usa protocolo + título; condo name fica implícito pela rota — desvio honesto, sem fabricar.)
3. Status control + atribuição ("Assumir" + picker "Atribuir a outro" + responsável resolvido) → Tasks 10, 11, 8.1, 8.2, 14.
4. Descrição em bloco muted → Task 14.
5. Timeline com item `created` UI-only + map `comment_added`/`payload.text` → Tasks 3, 12.
6. Composer sem aviso Telegram → Task 13.
7. Repontar overviews → Task 16.

**Endpoints:** events (Task 6), status (Task 7), assign sem body (Task 8), assign-to (Tasks 1, 8.1), managers (Tasks 1, 8.2), comments `{ text }` (Task 9) — todos batem com `src/api/types.ts` após o sync da Task 1.

**Task 1 como gate bloqueante:** o appendix pedia só "registrar issue antes de iniciar"; esta versão vai além — a Task 1 **implementa e merge** a fatia vertical no Core (assign-to + listagem de managers com identidade via `IdentityResolver`, Go/TDD) e regenera os tipos do dashboard antes de qualquer código de frontend. Decisão 2026-05-23: identidade resolvida de `auth.users` atrás de uma porta (lock-in baixo); picker email-first (nome quando houver).

**Type consistency:** `TicketEvent`/`TimelineItem`/`buildTimeline`/`commentText`/`statusChange` (Task 3) usados em `useTicketEvents` (Task 6) e `TicketTimeline` (Task 12). `CondoManager` (Task 8.2) consumido por `TicketAssignControl` (Task 11) e `TicketDetailPage` (Task 14). `useUpdateStatus.updateStatus(status)`, `useClaimTicket.claim()`, `useAssignTo.assignTo(userId)`, `useAddComment.addComment(text, opts)` consumidos com a mesma assinatura na `TicketDetailPage`. queryKeys `["ticket", id]`/`["ticket-events", id]`/`["condo-managers", condoId]` consistentes entre query e invalidations.

**Placeholders:** nenhum "TODO/TBD"; todo código é literal. Pontos de verificação dependentes do ambiente (existência de tokens CSS e de ícones lucide) estão marcados como checagens explícitas, não como código vago.
