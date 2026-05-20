# Slice 6.2.1 — Form "Novo chamado" (`POST /tickets`) — Design

**Data:** 2026-05-20
**Status:** Spec aprovada, pronta para implementação plan
**Base:** `develop` (Slice 6.2 mergeada em PR #22)

---

## Contexto

A Slice 6.2 entregou a `TicketsPage` com o botão **"Novo chamado"** (visível para staff+) que hoje roteia para `/c/$condoId/tickets/new` — um placeholder `EmptyState`. Esta slice substitui o placeholder pelo form real de criação de chamado, consumindo `POST /tickets` do Core.

`POST /tickets` existe no Core (`RequireRole(RoleManager, RoleStaff)`), cria um ticket de manutenção vinculado a um morador e **notifica os managers do condo via Telegram** (`NotifyCondoManagers`). O contrato (`CreateTicketRequest`, já em `src/api/types.ts`):

| Campo            | Tipo          | Notas                                             |
| ---------------- | ------------- | ------------------------------------------------- |
| `title`          | string        | resumo do chamado                                 |
| `description`    | string        | opcional                                          |
| `priority`       | string        | `low \| medium \| high`                           |
| `location`       | string        | `"common_area" \| "unit"` (default `common_area`) |
| `location_ref`   | string        | texto livre, ex. "Elevador B", "Apto 101"         |
| `common_area_id` | string (UUID) | sobrescreve `location`/`location_ref`             |
| `resident_id`    | string (UUID) | morador vinculado                                 |

Resposta: `201` com `TicketResponse`, ou `400` com `{ [campo]: string }`.

---

## Escopo

### Inclui

- Form "Novo chamado" apresentado como **Modal (Radix Dialog)** sobre a lista de tickets, dirigido pela rota `/c/$condoId/tickets/new` (mesmo padrão modal-por-rota do `inbox/$ticketId`).
- Campos: **Título**, **Morador** (select), **Prioridade** (select), **Localização** (tipo + texto livre), **Descrição** (opcional).
- Picker de morador mínimo: hook `useResidents(condoId)` batendo em `GET /residents`, em `src/features/residents/` (camada de dados que a Slice 6.4 reaproveita — antecipamos só o hook + type guard, não a tela de aprovações).
- Mutation `useCreateTicket(condoId)` (`POST /tickets`), invalidando a query de tickets no sucesso.
- Validação: "Criar" só habilita com **título + morador + prioridade + localização (texto)** preenchidos.
- Tratamento de erro: `400` mapeado para banner + mensagem por campo; rede/5xx para banner genérico (form preservado para retry).
- Pós-sucesso: invalida lista, fecha modal, volta para `/c/$condoId/tickets`.
- Testes co-localizados para os 3 artefatos.

### Não inclui (out of scope)

- Picker de **área comum** (`common_area_id`, UUID) — exigiria `GET /common-areas` (UI da Slice 6.6). Localização fica como texto livre (`location_ref`), que cobre os dois tipos.
- Tela de aprovações / listagem de moradores (Slice 6.4) — só o hook de dados é antecipado.
- Sistema de toast — o projeto não tem; feedback de sucesso é o refresh da lista + fechamento do modal.
- Navegar para o detalhe do ticket criado — a page de detalhe é da Slice 6.5; acoplaria as slices.
- Edição/exclusão de ticket.
- Upload de anexos/fotos.

---

## Arquitetura

### Arquivos

```
src/features/residents/
  useResidents.ts            # NOVO — useQuery GET /residents + type guard isResident
  useResidents.test.tsx
src/features/tickets/
  useCreateTicket.ts         # NOVO — useMutation POST /tickets
  useCreateTicket.test.tsx
  TicketCreateModal.tsx      # NOVO — o form em Modal
  TicketCreateModal.test.tsx
  TicketCreateModal.module.css
src/app/routes/_app/c/$condoId/tickets/
  new.tsx                    # MODIFICAR — render TicketCreateModal (sai EmptyState)
```

### Componentes e responsabilidades

**`useResidents(condoId)`** (`src/features/residents/`)

- `useQuery(["residents", condoId])` → `GET /residents`.
- Type guard `isResident(r): r is Resident` validando **cada item** da coleção (regra de tipagem honesta: `openapi-typescript` marca tudo opcional; nunca `as Resident`). Campos mínimos validados: `id`, `name`, `status`.
- Retorna moradores **excluindo `status === "PENDING"`** (pendentes ainda não são moradores efetivos — não devem aparecer no picker de criação).
- Tipo de domínio `Resident` em `src/types/resident.ts` (espelha o padrão de `src/types/ticket.ts`), com `isResident` exportado de lá.

**`useCreateTicket(condoId)`** (`src/features/tickets/`)

- `useMutation` (precedente: `src/features/activity/useMarkRead.ts`).
- `mutationFn`: `POST /tickets` com `CreateTicketRequest`.
- `onSuccess`: `queryClient.invalidateQueries({ queryKey: ["tickets", condoId] })`.
- Mapeia `400 { campo: erro }` para um objeto de erros por campo + mensagem geral; erro de rede/5xx para mensagem genérica. Refina o body `unknown` via type guard antes de usar (regra de tipagem honesta).

**`TicketCreateModal`** (`src/features/tickets/`)

- Props: `{ condoId: string; onClose: () => void }`.
- Renderiza `Modal` (Radix) com `<form>`; controles de form são elementos nativos (`input`/`select`/`textarea`) estilizados via CSS Module + design tokens, seguindo o padrão do `TicketsFilters` — **sem** introduzir primitivo UI novo (YAGNI; extrair só se reusado).
- Estado local do form (`useState`); validação derivada (`canSubmit`).
- Consome `useResidents` (Spinner/estado de loading no select) e `useCreateTicket`.

**`new.tsx`** (rota)

- Mantém `beforeLoad: requireRole("staff")` (já existe).
- Renderiza `<TicketCreateModal condoId={...} onClose={() => navigate({ to: "/c/$condoId/tickets", params })} />`.
- `condoId` lido via `Route.useParams()`.

### Form

| Campo               | Controle                      | Obrigatório                               | Mapeia para    |
| ------------------- | ----------------------------- | ----------------------------------------- | -------------- |
| Título              | `input[type=text]`            | ✅                                        | `title`        |
| Morador             | `select` (de `useResidents`)  | ✅                                        | `resident_id`  |
| Prioridade          | `select` low/medium/high      | ✅ (sem default; placeholder "Selecione") | `priority`     |
| Localização — tipo  | `select` Unidade / Área comum | — (default `common_area`)                 | `location`     |
| Localização — texto | `input[type=text]`            | ✅                                        | `location_ref` |
| Descrição           | `textarea`                    | opcional                                  | `description`  |

`canSubmit = title.trim() && resident_id && priority && location_ref.trim()`.

`description` opcional: omitir a chave do payload quando vazia (`exactOptionalPropertyTypes` proíbe `description: undefined`).

---

## Fluxo & estados

1. Rota `tickets/new` monta → modal abre; `useResidents` carrega (select desabilitado + "Carregando…" enquanto `isPending`).
2. Usuário preenche; "Criar" habilita só quando `canSubmit`.
3. Submit (`type="submit"`) → `useCreateTicket.mutate(payload)`. Botão "Criar" → "Criando…" + `disabled`.
4. **201** → `invalidateQueries(["tickets", condoId])`, `onClose()` (navega para `/tickets`). O novo chamado aparece na lista atualizada.
5. **400** → banner `role="alert"` no topo do form + mensagem por campo quando o `{campo: erro}` casar com um campo conhecido.
6. **Rede/5xx** → banner genérico; form permanece preenchido para retry.

---

## Acessibilidade

- Cada campo com `<label htmlFor={id}>` associado; obrigatórios sinalizados visual e textualmente.
- Mensagens de erro de campo via `aria-describedby`.
- Radix Dialog cuida do focus trap e `Esc`/overlay-click para fechar (ver convenção de overlay `pointer-events: auto` no CLAUDE.md).
- "Criar" é `type="submit"`; "Cancelar" é `type="button"` (evita submit acidental).
- `useResidents` em erro: o select mostra estado de erro e o submit fica bloqueado (não dá pra criar sem morador).

---

## Testes

- **`useResidents`**: mock `@/api/client` via `vi.mock` + `vi.hoisted`; filtra `PENDING`; `isResident` rejeita item parcial (shape incompleto não vaza); caminho de erro.
- **`useCreateTicket`**: sucesso invalida `["tickets", condoId]`; `400` mapeado para erros por campo; erro de rede vira mensagem genérica.
- **`TicketCreateModal`**: "Criar" desabilitado até o form válido; submit chama a mutation com o payload correto (incluindo omissão de `description` vazia e `location` default); exibe banner em erro `400`; fecha (`onClose`) no sucesso. Mocks env-bound via `vi.mock`+`vi.hoisted`.

---

## A verificar no planejamento

- Confirmar no `core@develop` (`internal/adapters/http`) o **nome exato do campo** (`resident_id`) e se o Core **rejeita payload sem `resident_id`**. Como o form já o torna obrigatório, isso ajusta apenas as mensagens de erro/validação, não o happy path.
- Confirmar o shape de `ResidentResponse` retornado por `GET /residents` (campos `id`/`name`/`status`/`unit_id`) para o type guard.
- Regenerar tipos (`npm run sync:swagger && npm run gen:api`) se houver drift — o CI tem "Swagger drift check".

---

## Riscos & decisões

- **Antecipar `useResidents`**: a Slice 6.4 vai construir a tela de aprovações sobre `GET /residents`. Colocá-lo em `src/features/residents/` agora evita retrabalho; a 6.4 reusa o hook (ou estende com filtro `PENDING` para o caso dela). Risco baixo: o hook é pequeno e o type guard é o mesmo.
- **Localização como texto livre**: aceita-se perda de vínculo estruturado com unidade/área comum (UUIDs) nesta slice. Quando a 6.6 expuser áreas comuns, uma slice futura pode trocar o `location_ref` por picker e preencher `common_area_id`.
- **Sem toast**: feedback de sucesso depende do refresh da lista. Se produto pedir confirmação explícita, o banner inline (padrão `role="alert"` já usado para erro de export na `TicketsPage`) é o caminho de menor custo.
