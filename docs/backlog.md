# Backlog — itens adiados conscientemente

Registro de features que foram discutidas mas tiradas do escopo de um Plan, com contexto suficiente para retomar depois sem precisar re-pesquisar.

---

## Vinculação de Telegram do gestor (adiado de Plan 3 → Plan de Notificações)

**Decidido em:** 2026-05-02 (brainstorm Plan 3)

**Resumo:** O Core expõe `PATCH /managers/me/telegram` que recebe `{chat_id: int64}` e grava em `condo_managers.telegram_chat_id` por **par user_id + condo_id** (binding é por condo, não global). O `chat_id` é usado pelo Core para mandar notificações ao gestor via bot do Telegram (novos tickets, aprovações pendentes etc.).

**Por que foi adiado:** vincular Telegram bem feito implica mudança no Core (endpoint novo de pareamento por token + handler no bot). Notificações merecem um Plan dedicado que defina o conjunto de canais (Telegram, web push, email) e preferências do usuário, em vez de entrar de improviso no shell do dashboard.

**Opções de implementação avaliadas:**

### Opção A — Deep link com token de pareamento (recomendada)

Fluxo:

1. Dashboard chama endpoint novo, ex.: `POST /managers/me/telegram/pair`, recebe `{token, deeplink: "https://t.me/ZivyBot?start=pair_<token>"}`.
2. UI mostra botão "Vincular Telegram" → abre o deeplink.
3. Bot recebe `/start pair_<token>`, resolve `user_id` + `condo_id` a partir do token e grava o próprio `chat_id` em `condo_managers.telegram_chat_id`.
4. Dashboard confirma vinculação (polling em `GET /managers/me/telegram/status` ou via realtime).

**Mudanças necessárias no Core:**

- Tabela/coluna para tokens de pareamento (TTL curto, single-use).
- Endpoint `POST /managers/me/telegram/pair` (gera token).
- Endpoint `GET /managers/me/telegram/status` (frontend consulta se vinculou).
- Handler no bot do Telegram para `/start pair_<token>`.

**Pró:** UX excelente, sem fricção, sem erro humano. **Contra:** maior esforço, exige coordenação com o repo `core`.

### Opção B — Usuário cola o `chat_id` manualmente (já suportada hoje)

Fluxo:

1. UI instrui o usuário a abrir o bot, mandar `/meuid` (ou comando equivalente), copiar o número devolvido.
2. Usuário cola o número em um input no dashboard.
3. Dashboard chama `PATCH /managers/me/telegram` com `{chat_id}`.

**Mudanças necessárias no Core:** nenhuma (endpoint já existe). Bot precisa ter o comando `/meuid` (verificar se já tem, senão é adição trivial).

**Pró:** funciona com o que já existe. **Contra:** UX ruim, propenso a erro de digitação, vai ter que ser refeito mais cedo ou mais tarde.

### Opção C — Adiar Telegram inteiramente (escolhida)

Tira da UI do Plan 3 e move para um Plan futuro de Notificações que vai cobrir Telegram + web push + email + central in-app + preferências do usuário.

**Recomendação para o Plan futuro:** ir direto para Opção A. Não passar por B como etapa intermediária.

**Endpoints relevantes no Core (referência):**

- `PATCH /managers/me/telegram` — `core/internal/adapters/http/manager_handler.go` (registerTelegram)
- Coluna no banco: `condo_managers.telegram_chat_id` (`pgtype.Int8`)
- Helper interno: `ListChatIDsByCondo` (já usado para mandar notificações por condo)
