# Slice — Toasts + delay/undo na mudança de status — Design

**Data:** 2026-05-28
**Status:** Spec aprovada, pronta para implementação plan
**Base:** `develop` (Slice 6.5 em PR #26)

---

## Contexto

A `TicketDetailPage` (Plan 6.5, PR #26) hoje dá feedback de erro de mutation via banner inline (`role="alert"` + `<p className={styles.writeError}>`). Dois problemas levantados no review do PR:

1. **Mudança de status não tem confirmação.** Mudar o status do chamado é uma ação pesada — o Core dispara notificação Telegram para o morador. Sem qualquer fricção, um clique acidental em "Resolvido" já vaza para o morador.
2. **Falta de toasts sistêmicos.** Erros inline cobrem só o caso da action falhar; não há feedback de sucesso ("comentário publicado") e o padrão é inconsistente entre features (banner em uns lugares, alert em outros, nada em outros).

Esta slice resolve os dois problemas em conjunto: o **toast com Desfazer é a confirmação** da mudança de status — execução otimista com janela de 5s para reverter, depois commit no Core. As demais mutations da ticket-detail (assumir, atribuir, comentar) ganham toast de sucesso/erro padrão.

---

## Escopo

### Inclui

- **Adapter `src/lib/notify.ts`**: API única (`success`, `error`, `deferred`, `commitNow`, `cancel`) sobre [sonner](https://sonner.emilkowal.ski/).
- **Toaster montado em `app/providers.tsx`** em `bottom-right`, com tema reagindo ao `themeStore`.
- **Padrão delay+undo na mudança de status** (`useUpdateStatus`): UI otimista + 5s de janela com botão Desfazer; commit dispara PATCH (e Telegram) só depois do timer.
- **Toasts de sucesso/erro nas outras 3 mutations** de `features/ticket-detail/`: `useClaimTicket`, `useAssignTo`, `useAddComment`.
- **Estado visual "pendente" no `TicketStatusControl`** (outline tracejado no botão otimista durante a janela).
- **Remoção do `writeError`/`commentError` inline** da `TicketDetailPage`.
- Testes co-localizados (`notify.test.ts` + atualização dos testes de hook).

### Não inclui

- Migração das 8 outras telas com `role="alert"` (login, criar ticket, aprovações, overview etc.). Fica para slice de polish dedicada — esta cobre só ticket-detail.
- Padrão de toast para o aviso PWA "nova versão disponível" (já tem fluxo próprio em `vite-plugin-pwa`).
- Confirmação dura (dialog "tem certeza?") para qualquer transição — o produto descartou em favor de undo.

---

## Decisões de produto

1. **Toast com Desfazer é a confirmação.** Modal de confirmação foi descartado: adiciona fricção desnecessária para gestor que mexe em muitos tickets/dia e gera "modal sobre modal" na `TicketDetailPage` (que já vive num Radix Dialog).
2. **Delay 5s antes do PATCH.** Verdadeiro undo: UI otimista nos 5s, mas nem o Core nem o Telegram são tocados. Se o usuário clica Desfazer, nada vaza para o morador.
3. **Fechar o modal commita.** Cleanup no unmount chama `commitNow(id)`. O toast continua visível fora do modal (sonner portala no `body`).
4. **Cliques rápidos coalescem.** Mesmo `id` no `notify.deferred` cancela timer anterior, roda rollback otimista do anterior, agenda o novo. Resultado: 1 mutation final.
5. **Outras mutations: sucesso 3s, erro 6s com botão "Tentar novamente".** Sem undo (são aditivas ou idempotentes).
6. **A confirmação de re-atribuição existente fica.** `TicketAssignControl` já tem dialog de confirmação para "atribuir a outro com responsável já definido" — dialog é para _intenção_, toast é para _resultado_. Coexistem.
7. **`sonner` ~5KB.** Headless-friendly, `aria-live` por default, action prop nativo. Wrap num adapter para isolar o call site da lib.

---

## Arquitetura

### `src/lib/notify.ts` — adapter

```ts
type DeferredOpts = {
  delayMs: number;
  onCommit: () => void;
  onUndo?: () => void;
  description?: string;
};

export const notify = {
  success(message: string, opts?: { description?: string; duration?: number }): void;
  error(message: string, opts?: { description?: string; retry?: () => void }): void;
  deferred(id: string, message: string, opts: DeferredOpts): void;
  commitNow(id: string): void;
  cancel(id: string): void;
};
```

- **Estado de timers**: `Map<string, { timer: number; commit: () => void; undo?: () => void }>` no escopo do módulo. Sobrevive a re-renders e unmounts (commit no cleanup vai do hook).
- **`deferred(id, ...)` com `id` repetido**: chama `undo?()` do registro anterior, `clearTimeout`, registra o novo. Toast com mesmo id é atualizado no sonner (`toast(message, { id })`).
- **`commitNow(id)`**: `clearTimeout` + `commit()` síncrono, remove do Map. Não dispara `undo`.
- **`cancel(id)`**: `clearTimeout` + `undo?()`, remove. Não dispara `commit`.
- **`success`/`error`**: passam direto pro `sonner.toast.success`/`sonner.toast.error`. `error.retry` vira `action: { label: "Tentar novamente", onClick: retry }`.
- **Toast pendente do `deferred`**: usa `sonner.toast(message, { id, duration: delayMs, action: { label: "Desfazer", onClick: () => cancel(id) } })`. Quando o timer expira ou `commitNow` é chamado, o toast é dismissado via `sonner.toast.dismiss(id)`. Se o caller quiser feedback de sucesso pós-commit, chama `notify.success(...)` dentro do próprio `onCommit`. Se o PATCH falha depois do commit, o `onError` da mutation chama `notify.error(...)` — o adapter não orquestra esse fluxo.

**Sem env import** (testável sem `.env.local`).

### `app/providers.tsx` — Toaster

```tsx
import { Toaster } from "sonner";
import { useThemeStore } from "@/stores/theme";

// dentro de <Providers>
const theme = useThemeStore((s) => s.mode);
<Toaster
  position="bottom-right"
  theme={theme === "system" ? "system" : theme}
  closeButton
  richColors
  duration={3000}
/>;
```

Mobile: sonner já adapta `position` para top-center em viewport pequena (config default).

### `useUpdateStatus` — fluxo delay+undo

API atual (`updateStatus(status, opts?)`) passa a ser orquestradora. Novo helper interno:

```ts
function updateStatusDeferred(targetStatus: TicketStatus) {
  const id = `ticket-status-${ticketId}`;
  const previousStatus = ticket.status; // snapshot
  // 1. otimista no cache
  qc.setQueryData(["ticket", ticketId], (t) => ({ ...t, status: targetStatus }));
  // 2. agenda
  notify.deferred(id, `Status alterado para ${LABEL[targetStatus]}`, {
    delayMs: 5000,
    onCommit: () => m.mutate(targetStatus),
    onUndo: () => qc.setQueryData(["ticket", ticketId], (t) => ({ ...t, status: previousStatus })),
  });
}
```

- `m.mutate(targetStatus)` já invalida `["ticket"]`/`["ticket-events"]`/`["tickets"]` no `onSuccess` (já feito no PR #26).
- Erro pós-commit (PATCH falha): `m.onError` chama `notify.error("Não foi possível alterar status", { retry: () => m.mutate(targetStatus) })` e desfaz otimista.
- Cleanup no `TicketDetailPage` (effect com cleanup que chama `notify.commitNow("ticket-status-" + ticketId)`).

### Outras 3 mutations

Cada hook ganha `notify.success` no `onSuccess` do `useMutation` e `notify.error(..., { retry: () => m.mutate(vars) })` no `onError`. UI fica magra: `TicketDetailPage` só clica, sem `isError`/`writeError`/`commentError`.

Textos:

- `useClaimTicket`: ✓ "Você assumiu o chamado" / ✗ "Não foi possível assumir"
- `useAssignTo`: ✓ "Atribuído a {nome}" / ✗ "Não foi possível atribuir"
- `useAddComment`: ✓ "Comentário publicado" / ✗ "Não foi possível publicar"

`{nome}` em `useAssignTo` resolve email-first (mesmo padrão do `TicketAssignControl`).

### `TicketStatusControl` — estado pendente

Recebe `pendingStatus` (já recebe via `useUpdateStatus`). Novo CSS:

```css
.segButton.pending {
  outline: 2px dashed var(--brand);
  outline-offset: -3px;
}
```

Botão visualmente indica "ainda não consolidou no servidor". Some quando `pendingStatus === undefined`.

---

## Migração na `TicketDetailPage`

**Remove:**

- `writeError` (linha ~50): consolidava `statusError || claimError || assignError`. → toast.
- `commentError` (seção do composer). → toast.
- 2 blocos `<p className={styles.writeError} role="alert">`.
- CSS `.writeError` em `TicketDetailPage.module.css`.

**Adiciona:**

- `<Toaster />` em `app/providers.tsx` (1x para app inteiro).
- `import { notify } from "@/lib/notify"` nos 4 hooks.
- `useEffect(() => () => notify.commitNow("ticket-status-" + ticketId), [ticketId])` no `TicketDetailPage`.
- Classe `.pending` no `TicketStatusControl.module.css`.

**Não altera:**

- `TicketAssignControl` confirm dialog para re-atribuição.
- Invalidações de cache nas mutations.
- Type guards e tipagem honesta.

---

## Acessibilidade

- Sonner adiciona `aria-live="polite"` ao viewport por default.
- `closeButton` com `aria-label="Fechar notificação"`.
- Botão Desfazer: `aria-label="Desfazer mudança para Resolvido"` (varia com status alvo).
- Foco **não** é roubado pelos toasts (`polite` não interrompe).
- Botão `.pending` no segmented mantém `aria-pressed` no status otimista — leitores de tela narram "Resolvido, selecionado, pendente de confirmação".

---

## Testes

### `src/lib/notify.test.ts` (novo)

- `deferred` dispara `onCommit` após `delayMs` (`vi.useFakeTimers`).
- `cancel(id)` cancela timer, chama `onUndo`, não chama `onCommit`.
- `commitNow(id)` cancela timer, chama `onCommit` síncrono.
- `deferred` com `id` repetido: cancela anterior (chama `onUndo` do anterior), agenda novo.
- `success`/`error` chamam `sonner.toast.success`/`error` com args corretos (mock de `sonner`).
- `error` com `retry` passa `action` correto.

### Hooks

Mockar `@/lib/notify` via `vi.mock` + `vi.hoisted` (mesmo padrão de `@/api/client`).

- `useUpdateStatus`: agendar com `updateStatusDeferred("resolved")` chama `notify.deferred` com id correto + delayMs 5000 + setQueryData otimista; após `vi.runAllTimers()`, PATCH dispara e invalidações rodam; erro pós-commit chama `notify.error` com `retry`.
- `useClaimTicket`/`useAssignTo`/`useAddComment`: success → `notify.success` com texto correto; error → `notify.error` com `retry` que re-mutaria.

### Componentes

- `TicketDetailPage.test.tsx`: remove asserts sobre `writeError`/`commentError`; valida que `notify.deferred`/`notify.success` foram chamados.
- `TicketStatusControl.test.tsx`: estado `.pending` aplicado quando `pendingStatus` está setado; `aria-pressed` no status otimista.

### Smoke manual (PR)

- Clicar "Resolvido" → toast com Desfazer → clicar Desfazer → badge volta, sem Telegram.
- Clicar "Resolvido" → esperar 5s → PATCH dispara → toast some, badge fica.
- Clicar "Resolvido" → 2s depois "Em andamento" → toast atualiza, 1 PATCH final.
- Clicar "Resolvido" → fechar modal antes dos 5s → PATCH dispara mesmo assim.
- Erro de rede simulado → toast vermelho com "Tentar novamente".
- Tema dark/light → toasts respeitam.

---

## Riscos e mitigações

| Risco                                                | Mitigação                                                                                     |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Timer continua após HMR → vazamento                  | Map de timers é por-módulo; HMR substitui o módulo e zera. Cleanup do hook força commit.      |
| Usuário não percebe a janela de 5s                   | Toast tem countdown visual (sonner `duration={5000}` mostra a barra).                         |
| `notify.deferred` chamado fora do React (test)       | Adapter é puro; testável com fake timers.                                                     |
| Lib sonner muda API                                  | Adapter isola: todas as chamadas passam por `notify`. Trocar lib = reescrever só `notify.ts`. |
| `commitNow` no unmount + Strict Mode (double effect) | Idempotente: `commitNow` para id ausente é no-op.                                             |

---

## Follow-ups (fora do escopo)

1. Migrar os 8 outros `role="alert"` para `notify.error`/`notify.success`.
2. Avaliar se transições específicas merecem confirmação dura (ex.: "Fechado" depois de "Resolvido" se virar irreversível no Core).
3. Considerar API `notify.promise(promise, { loading, success, error })` quando aparecer um caso de loading visível.
4. Avaliar Telegram com delay no próprio Core (atrasar dispatch em 5s) — elimina a janela onde o front e o servidor estão dessincronizados se o cleanup falhar.
