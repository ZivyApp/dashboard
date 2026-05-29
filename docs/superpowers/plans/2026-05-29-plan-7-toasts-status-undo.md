# Plan 7 — Toasts + delay/undo na mudança de status — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o feedback inline da `TicketDetailPage` por toasts (sonner) com padrão delay+undo na mudança de status — execução otimista de 5s antes do PATCH ao Core.

**Architecture:** Adapter `src/lib/notify.ts` sobre `sonner` isolando o call site da lib (5 métodos: `success`, `error`, `deferred`, `commitNow`, `cancel`). Estado de timers vive no escopo do módulo (`Map<id, ...>`). Hooks da ticket-detail chamam o adapter no `onSuccess`/`onError` (claim/assign/comment) ou via `deferred` (status). UI fica magra — sem `writeError`/`commentError` inline.

**Tech Stack:** sonner `^2.0.7`, Vitest `^2.1.9` com `vi.useFakeTimers`, TanStack Query (mutations + invalidação), React 19 (otimismo via estado local `useState`), Zustand (theme store).

**Spec:** `docs/superpowers/specs/2026-05-28-toasts-status-undo-design.md`

**Branch:** `feature/plan-7-toasts-status-undo` (sair de `develop` quando o PR #26 for mergeado, ou continuar nesta mesma branch se o usuário preferir incrementar).

---

## File Structure

**Create:**

- `src/lib/notify.ts` — adapter (5 métodos). Responsabilidade única: isolar a lib de toast e encapsular o padrão delay+undo.
- `src/lib/notify.test.ts` — unitário do adapter (fake timers + mock de `sonner`).

**Modify:**

- `package.json` — adiciona `sonner` em `dependencies`.
- `src/app/providers.tsx` — monta `<Toaster />` reativo ao theme store.
- `src/features/ticket-detail/useUpdateStatus.ts` — substitui `updateStatus` por orquestração delay+undo (otimista + `notify.deferred`).
- `src/features/ticket-detail/useUpdateStatus.test.tsx` — testes do novo fluxo com fake timers.
- `src/features/ticket-detail/useClaimTicket.ts` — `notify.success`/`notify.error` no `onSuccess`/`onError`.
- `src/features/ticket-detail/useClaimTicket.test.tsx` — asserts via mock de `@/lib/notify`.
- `src/features/ticket-detail/useAssignTo.ts` — idem, com `notify.success("Atribuído a {nome}")`.
- `src/features/ticket-detail/useAssignTo.test.tsx` — idem.
- `src/features/ticket-detail/useAddComment.ts` — idem.
- `src/features/ticket-detail/useAddComment.test.tsx` — idem.
- `src/features/ticket-detail/TicketStatusControl.tsx` — classe `pending` no botão otimista.
- `src/features/ticket-detail/TicketStatusControl.module.css` — `.pending` (outline tracejado).
- `src/features/ticket-detail/TicketStatusControl.test.tsx` — assert da classe `pending`.
- `src/features/ticket-detail/TicketDetailPage.tsx` — remove `writeError`/`commentError`/asserts inline, adiciona effect cleanup → `notify.commitNow`.
- `src/features/ticket-detail/TicketDetailPage.module.css` — remove `.writeError`.
- `src/features/ticket-detail/TicketDetailPage.test.tsx` — remove asserts de erro inline, adiciona asserts de chamada ao `notify`.

---

## Convenções recorrentes (releitura obrigatória)

- **Tipagem honesta** (CLAUDE.md): nada de `any`, `as any`, `@ts-ignore`. Type guards em payload de API; `exactOptionalPropertyTypes` (omitir chave em vez de `prop: undefined`).
- **Mocks de hooks com `@/api/client`**: usar `vi.mock` + `vi.hoisted`, NÃO `vi.spyOn` (carrega `@/lib/env` e quebra em CI sem `.env.local`). Mesmo padrão se aplica ao mock de `@/lib/notify`.
- **Handlers com Promise**: envoltar em `() => { void mutate(); }` por `no-misused-promises`.
- **Botões**: `type="button"` por default.
- **CSS Modules**: classes via `Record<K, string>` com fallback `?? ""`; tokens (`var(--*)`) em vez de valores cru.
- **Comentários**: defaultar para nenhum. Só onde o "porquê" é não-óbvio.
- **commitlint**: subject não começa com PascalCase. Usar `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.

---

### Task 1: Instalar sonner

**Files:**

- Modify: `package.json` (deps)
- Modify: `package-lock.json` (auto)

- [ ] **Step 1: Confirmar versão atual no registry**

Run: `npm view sonner version`
Expected: `2.0.7` (ou superior 2.x).

- [ ] **Step 2: Instalar fixando a major**

Run: `npm install sonner@^2.0.7`
Expected: `package.json` ganha `"sonner": "^2.0.7"` em `dependencies`.

- [ ] **Step 3: Verificar build limpo**

Run: `npm run typecheck && npm run build`
Expected: ambos passam (sonner traz seus próprios tipos).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): adiciona sonner para sistema de toasts"
```

---

### Task 2: Adapter `notify.ts` — base do método `success`

**Files:**

- Create: `src/lib/notify.ts`
- Create: `src/lib/notify.test.ts`

- [ ] **Step 1: Escrever teste falho para `notify.success`**

Em `src/lib/notify.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

const { sonnerSuccess, sonnerError, sonnerToast, sonnerDismiss } = vi.hoisted(() => ({
  sonnerSuccess: vi.fn(),
  sonnerError: vi.fn(),
  sonnerToast: vi.fn(),
  sonnerDismiss: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(sonnerToast, {
    success: sonnerSuccess,
    error: sonnerError,
    dismiss: sonnerDismiss,
  }),
}));

import { notify } from "./notify";

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("notify.success", () => {
  it("delega para sonner.toast.success com a mensagem", () => {
    notify.success("Salvo");
    expect(sonnerSuccess).toHaveBeenCalledWith("Salvo", expect.any(Object));
  });

  it("passa description quando informado", () => {
    notify.success("Salvo", { description: "Mudança aplicada" });
    expect(sonnerSuccess).toHaveBeenCalledWith(
      "Salvo",
      expect.objectContaining({ description: "Mudança aplicada" }),
    );
  });
});
```

- [ ] **Step 2: Rodar teste — deve falhar**

Run: `npx vitest run src/lib/notify.test.ts`
Expected: FAIL com `Cannot find module './notify'`.

- [ ] **Step 3: Implementar `notify.success` mínimo**

Em `src/lib/notify.ts`:

```ts
import { toast } from "sonner";

type SuccessOpts = { description?: string; duration?: number };

export const notify = {
  success(message: string, opts: SuccessOpts = {}): void {
    toast.success(message, opts);
  },
};
```

- [ ] **Step 4: Rodar — deve passar**

Run: `npx vitest run src/lib/notify.test.ts`
Expected: PASS, 2 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notify.ts src/lib/notify.test.ts
git commit -m "feat(notify): adapter base com notify.success"
```

---

### Task 3: Adapter — método `error` com retry

**Files:**

- Modify: `src/lib/notify.ts`
- Modify: `src/lib/notify.test.ts`

- [ ] **Step 1: Testes falhos para `notify.error`**

Adicionar em `src/lib/notify.test.ts`:

```ts
describe("notify.error", () => {
  it("delega para sonner.toast.error com a mensagem", () => {
    notify.error("Falhou");
    expect(sonnerError).toHaveBeenCalledWith("Falhou", expect.any(Object));
  });

  it("monta action 'Tentar novamente' quando retry é passado", () => {
    const retry = vi.fn();
    notify.error("Falhou", { retry });
    expect(sonnerError).toHaveBeenCalledWith(
      "Falhou",
      expect.objectContaining({
        action: { label: "Tentar novamente", onClick: retry },
      }),
    );
  });

  it("não monta action quando retry é omitido", () => {
    notify.error("Falhou");
    const call = sonnerError.mock.calls[0]?.[1];
    expect(call).not.toHaveProperty("action");
  });
});
```

- [ ] **Step 2: Rodar — devem falhar**

Run: `npx vitest run src/lib/notify.test.ts`
Expected: FAIL — `notify.error is not a function`.

- [ ] **Step 3: Implementar `notify.error`**

Em `src/lib/notify.ts`, adicionar:

```ts
type ErrorOpts = { description?: string; retry?: () => void };

export const notify = {
  success(message: string, opts: SuccessOpts = {}): void {
    toast.success(message, opts);
  },
  error(message: string, opts: ErrorOpts = {}): void {
    const { retry, ...rest } = opts;
    const payload: Record<string, unknown> = { ...rest };
    if (retry) {
      payload.action = { label: "Tentar novamente", onClick: retry };
    }
    toast.error(message, payload);
  },
};
```

- [ ] **Step 4: Rodar — devem passar**

Run: `npx vitest run src/lib/notify.test.ts`
Expected: PASS, 5 testes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notify.ts src/lib/notify.test.ts
git commit -m "feat(notify): error com action de retry opcional"
```

---

### Task 4: Adapter — `deferred` + `cancel` + `commitNow`

**Files:**

- Modify: `src/lib/notify.ts`
- Modify: `src/lib/notify.test.ts`

- [ ] **Step 1: Testes falhos para `deferred`**

Adicionar em `src/lib/notify.test.ts`:

```ts
describe("notify.deferred", () => {
  it("dispara onCommit após delayMs", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    notify.deferred("id-1", "Aplicando", { delayMs: 5000, onCommit });
    expect(onCommit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(onCommit).toHaveBeenCalledOnce();
  });

  it("registra toast no sonner com id, duration e action 'Desfazer'", () => {
    vi.useFakeTimers();
    notify.deferred("id-1", "Aplicando", { delayMs: 5000, onCommit: vi.fn() });
    expect(sonnerToast).toHaveBeenCalledWith(
      "Aplicando",
      expect.objectContaining({
        id: "id-1",
        duration: 5000,
        action: expect.objectContaining({ label: "Desfazer" }),
      }),
    );
  });

  it("cancel(id) chama onUndo e bloqueia o onCommit do timer", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    const onUndo = vi.fn();
    notify.deferred("id-1", "Aplicando", { delayMs: 5000, onCommit, onUndo });
    notify.cancel("id-1");
    vi.advanceTimersByTime(5000);
    expect(onUndo).toHaveBeenCalledOnce();
    expect(onCommit).not.toHaveBeenCalled();
    expect(sonnerDismiss).toHaveBeenCalledWith("id-1");
  });

  it("commitNow(id) dispara onCommit síncrono e bloqueia o timer", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    notify.deferred("id-1", "Aplicando", { delayMs: 5000, onCommit });
    notify.commitNow("id-1");
    expect(onCommit).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(5000);
    expect(onCommit).toHaveBeenCalledOnce();
    expect(sonnerDismiss).toHaveBeenCalledWith("id-1");
  });

  it("deferred com mesmo id descarta o timer anterior SEM rodar seu onUndo e agenda novo", () => {
    vi.useFakeTimers();
    const firstUndo = vi.fn();
    const firstCommit = vi.fn();
    const secondCommit = vi.fn();
    notify.deferred("id-1", "Primeiro", {
      delayMs: 5000,
      onCommit: firstCommit,
      onUndo: firstUndo,
    });
    notify.deferred("id-1", "Segundo", { delayMs: 5000, onCommit: secondCommit });
    // O caller já sobrescreveu o estado com a nova intenção; rodar o undo antigo
    // clobbaria esse novo estado. Replace só re-arma o timer.
    expect(firstUndo).not.toHaveBeenCalled();
    expect(firstCommit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(secondCommit).toHaveBeenCalledOnce();
  });

  it("cancel/commitNow para id ausente é no-op (não lança)", () => {
    expect(() => notify.cancel("nope")).not.toThrow();
    expect(() => notify.commitNow("nope")).not.toThrow();
  });
});
```

- [ ] **Step 2: Rodar — devem falhar**

Run: `npx vitest run src/lib/notify.test.ts`
Expected: FAIL — `notify.deferred is not a function`.

- [ ] **Step 3: Implementar `deferred`/`cancel`/`commitNow`**

Substituir o conteúdo de `src/lib/notify.ts` por:

```ts
import { toast } from "sonner";

type SuccessOpts = { description?: string; duration?: number };
type ErrorOpts = { description?: string; retry?: () => void };
type DeferredOpts = {
  delayMs: number;
  onCommit: () => void;
  onUndo?: () => void;
  description?: string;
};

type Pending = {
  timer: ReturnType<typeof setTimeout>;
  commit: () => void;
  undo: (() => void) | undefined;
};

const pending = new Map<string, Pending>();

function clearAndRun(id: string, mode: "commit" | "undo") {
  const entry = pending.get(id);
  if (!entry) return;
  clearTimeout(entry.timer);
  pending.delete(id);
  toast.dismiss(id);
  if (mode === "commit") entry.commit();
  else entry.undo?.();
}

export const notify = {
  success(message: string, opts: SuccessOpts = {}): void {
    toast.success(message, opts);
  },
  error(message: string, opts: ErrorOpts = {}): void {
    const { retry, ...rest } = opts;
    const payload: Record<string, unknown> = { ...rest };
    if (retry) {
      payload.action = { label: "Tentar novamente", onClick: retry };
    }
    toast.error(message, payload);
  },
  deferred(id: string, message: string, opts: DeferredOpts): void {
    // Reentrada com mesmo id: descarta SÓ o timer anterior, sem rodar seu onUndo
    // (o caller já trocou o estado pela nova intenção; rodar o undo antigo
    // clobbaria essa troca). Re-arma com a nova intenção.
    const existing = pending.get(id);
    if (existing) clearTimeout(existing.timer);
    const timer = setTimeout(() => clearAndRun(id, "commit"), opts.delayMs);
    pending.set(id, { timer, commit: opts.onCommit, undo: opts.onUndo });
    const sonnerPayload: Record<string, unknown> = {
      id,
      duration: opts.delayMs,
      action: { label: "Desfazer", onClick: () => clearAndRun(id, "undo") },
    };
    if (opts.description !== undefined) sonnerPayload.description = opts.description;
    toast(message, sonnerPayload);
  },
  commitNow(id: string): void {
    clearAndRun(id, "commit");
  },
  cancel(id: string): void {
    clearAndRun(id, "undo");
  },
};
```

- [ ] **Step 4: Rodar — devem passar**

Run: `npx vitest run src/lib/notify.test.ts`
Expected: PASS, 11 testes (2 success + 3 error + 6 deferred).

- [ ] **Step 5: Commit**

```bash
git add src/lib/notify.ts src/lib/notify.test.ts
git commit -m "feat(notify): deferred com cancel/commitNow para padrão delay+undo"
```

---

### Task 5: Montar `<Toaster />` no `Providers`

**Files:**

- Modify: `src/app/providers.tsx`

- [ ] **Step 1: Adicionar Toaster com tema reativo**

Substituir `src/app/providers.tsx` por:

```tsx
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "./queryClient";
import { RepositoryProvider } from "@/features/activity/RepositoryProvider";
import { useThemeStore } from "@/stores/theme";

export function Providers({ children }: { children: ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  return (
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider>{children}</RepositoryProvider>
      <Toaster position="bottom-right" theme={mode} closeButton richColors duration={3000} />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Verificar typecheck/build**

Run: `npm run typecheck && npm run build`
Expected: ambos passam.

- [ ] **Step 3: Smoke manual no dev** (opcional mas recomendado)

Run em outro terminal: `npm run dev`
Abrir DevTools no app, executar no console: `(await import("/src/lib/notify.ts")).notify.success("teste")`
Expected: toast aparece bottom-right.

- [ ] **Step 4: Commit**

```bash
git add src/app/providers.tsx
git commit -m "feat(providers): monta Toaster reativo ao theme store"
```

---

### Task 6: Refatorar `useUpdateStatus` para delay+undo

**Files:**

- Modify: `src/features/ticket-detail/useUpdateStatus.ts`
- Modify: `src/features/ticket-detail/useUpdateStatus.test.tsx`

- [ ] **Step 1: Atualizar testes para o novo fluxo**

Substituir `src/features/ticket-detail/useUpdateStatus.test.tsx` por:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPatch } = vi.hoisted(() => ({ mockPatch: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { PATCH: mockPatch } }));

const { notifyDeferred, notifyCommitNow, notifyError } = vi.hoisted(() => ({
  notifyDeferred: vi.fn(),
  notifyCommitNow: vi.fn(),
  notifyError: vi.fn(),
  notifyCancel: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("@/lib/notify", () => ({
  notify: {
    deferred: notifyDeferred,
    cancel: vi.fn(),
    commitNow: notifyCommitNow,
    success: vi.fn(),
    error: notifyError,
  },
}));

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
  vi.clearAllMocks();
});

describe("useUpdateStatus", () => {
  it("updateStatus agenda notify.deferred com id, mensagem, delay 5000 e onCommit/onUndo", () => {
    const qc = mkClient();
    const { result } = renderHook(() => useUpdateStatus("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.updateStatus("resolved"));

    expect(notifyDeferred).toHaveBeenCalledWith(
      "ticket-status-t1",
      "Status alterado para Resolvido",
      expect.objectContaining({
        delayMs: 5000,
        onCommit: expect.any(Function),
        onUndo: expect.any(Function),
      }),
    );
  });

  it("marca pendingStatus imediatamente sem tocar o cache do ticket", () => {
    const qc = mkClient();
    const { result } = renderHook(() => useUpdateStatus("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.updateStatus("resolved"));

    expect(result.current.pendingStatus).toBe("resolved");
    // modelo de estado local: o cache do ticket NÃO é escrito otimisticamente
    expect(qc.getQueryData(["ticket", "t1"])).toBeUndefined();
  });

  it("onCommit dispara PATCH e invalida ticket/events/tickets", async () => {
    mockPatch.mockResolvedValue({ data: { ok: "true" }, error: undefined });
    const qc = mkClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useUpdateStatus("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.updateStatus("resolved"));
    const onCommit = notifyDeferred.mock.calls[0]?.[2].onCommit;
    expect(onCommit).toBeTypeOf("function");
    act(() => onCommit());

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    expect(mockPatch).toHaveBeenCalledWith("/tickets/{id}/status", {
      params: { path: { id: "t1" } },
      body: { status: "resolved" },
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket", "t1"] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket-events", "t1"] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tickets"] });
    });
  });

  it("onUndo limpa pendingStatus (volta a refletir data.status)", () => {
    const qc = mkClient();
    const { result } = renderHook(() => useUpdateStatus("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.updateStatus("resolved"));
    expect(result.current.pendingStatus).toBe("resolved");
    const onUndo = notifyDeferred.mock.calls[0]?.[2].onUndo;
    expect(onUndo).toBeTypeOf("function");
    act(() => onUndo());

    expect(result.current.pendingStatus).toBeUndefined();
  });

  it("erro pós-commit chama notify.error com retry e invalida ticket (rollback)", async () => {
    mockPatch.mockResolvedValue({ data: undefined, error: { message: "x" } });
    const qc = mkClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useUpdateStatus("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.updateStatus("resolved"));
    const onCommit = notifyDeferred.mock.calls[0]?.[2].onCommit;
    act(() => onCommit());

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    const errArgs = notifyError.mock.calls[0];
    expect(errArgs?.[0]).toBe("Não foi possível alterar status");
    expect(errArgs?.[1]).toMatchObject({ retry: expect.any(Function) });
    // rollback: refetch da verdade do servidor
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket", "t1"] });
  });
});
```

- [ ] **Step 2: Rodar — devem falhar**

Run: `npx vitest run src/features/ticket-detail/useUpdateStatus.test.tsx`
Expected: FAIL — testes esperam `updateStatus` agendar `notify.deferred`, mas a implementação atual chama `m.mutate` direto.

- [ ] **Step 3: Implementar o novo `useUpdateStatus`**

Substituir `src/features/ticket-detail/useUpdateStatus.ts` por:

```ts
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";
import type { TicketStatus } from "@/types/ticket";

const LABEL: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
};

export function useUpdateStatus(ticketId: string) {
  const qc = useQueryClient();
  // Otimismo é estado local: nunca escrevemos no cache do ticket durante a janela.
  // O consumidor exibe `pendingStatus ?? data.status`. Sem cache otimista não há
  // rollback a fazer no undo (basta limpar pending) nem clobber na coalescência.
  const [pending, setPending] = useState<TicketStatus | undefined>(undefined);

  const m = useMutation<void, Error, TicketStatus>({
    mutationFn: async (status) => {
      const { error } = await api.PATCH("/tickets/{id}/status", {
        params: { path: { id: ticketId } },
        body: { status },
      });
      if (error) {
        throw new Error(
          `TicketsService.updateStatus(${ticketId}): falha em PATCH /tickets/{id}/status`,
          { cause: error },
        );
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      void qc.invalidateQueries({ queryKey: ["ticket-events", ticketId] });
      void qc.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (_e, vars) => {
      // Não há otimista no cache para reverter; o refetch garante que a UI mostre
      // a verdade do servidor (o status que não mudou). Avisa com retry.
      void qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      notify.error("Não foi possível alterar status", {
        retry: () => m.mutate(vars),
      });
    },
  });

  // Handler de onClick — identidade não importa, sem useCallback de fachada.
  function updateStatus(targetStatus: TicketStatus) {
    setPending(targetStatus);
    notify.deferred(`ticket-status-${ticketId}`, `Status alterado para ${LABEL[targetStatus]}`, {
      delayMs: 5000,
      onCommit: () => {
        setPending(undefined);
        m.mutate(targetStatus);
      },
      onUndo: () => setPending(undefined),
    });
  }

  return {
    updateStatus,
    pendingStatus: pending,
    isError: m.isError,
  };
}
```

> **Assimetria intencional:** ao contrário de claim/assign/comment, o commit de status **não** emite `notify.success`. O toast `deferred` ("Status alterado para X") já serviu de confirmação durante a janela de 5s, e o badge reflete o novo status — um segundo toast no commit seria ruído. Só o caminho de erro (`onError`) fala de novo, porque aí a expectativa otimista foi quebrada.

- [ ] **Step 4: Rodar — devem passar**

Run: `npx vitest run src/features/ticket-detail/useUpdateStatus.test.tsx`
Expected: PASS, 5 testes.

- [ ] **Step 5: Commit**

```bash
git add src/features/ticket-detail/useUpdateStatus.ts src/features/ticket-detail/useUpdateStatus.test.tsx
git commit -m "feat(ticket-detail): delay+undo de 5s em useUpdateStatus"
```

---

### Task 7: `useClaimTicket` com toasts

**Files:**

- Modify: `src/features/ticket-detail/useClaimTicket.ts`
- Modify: `src/features/ticket-detail/useClaimTicket.test.tsx`

- [ ] **Step 1: Atualizar testes**

Substituir `src/features/ticket-detail/useClaimTicket.test.tsx` por:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPatch } = vi.hoisted(() => ({ mockPatch: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { PATCH: mockPatch } }));

const { notifySuccess, notifyError } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock("@/lib/notify", () => ({
  notify: {
    success: notifySuccess,
    error: notifyError,
    deferred: vi.fn(),
    commitNow: vi.fn(),
    cancel: vi.fn(),
  },
}));

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
  vi.clearAllMocks();
});

describe("useClaimTicket", () => {
  it("chama assign sem body e invalida ticket/events/tickets; toast de sucesso", async () => {
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
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tickets"] });
      expect(notifySuccess).toHaveBeenCalledWith("Você assumiu o chamado");
    });
  });

  it("em erro chama notify.error com retry", async () => {
    mockPatch.mockResolvedValue({ data: undefined, error: { message: "x" } });
    const qc = mkClient();
    const { result } = renderHook(() => useClaimTicket("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.claim());

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    const args = notifyError.mock.calls[0];
    expect(args?.[0]).toBe("Não foi possível assumir");
    expect(args?.[1]).toMatchObject({ retry: expect.any(Function) });
  });
});
```

- [ ] **Step 2: Rodar — devem falhar**

Run: `npx vitest run src/features/ticket-detail/useClaimTicket.test.tsx`
Expected: FAIL — falta `notify.success`/`notify.error` no hook.

- [ ] **Step 3: Implementar**

Substituir `src/features/ticket-detail/useClaimTicket.ts` por:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";

export function useClaimTicket(ticketId: string) {
  const qc = useQueryClient();
  // PATCH /tickets/{id}/assign não aceita body — o Core lê o manager autenticado
  // (MustUserFromContext) e auto-atribui. Atribuir a outro manager é o useAssignTo.
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
      void qc.invalidateQueries({ queryKey: ["tickets"] });
      notify.success("Você assumiu o chamado");
    },
    onError: () => {
      notify.error("Não foi possível assumir", {
        retry: () => m.mutate(),
      });
    },
  });

  return {
    claim: (opts?: { onSuccess?: () => void }) => m.mutate(undefined, opts),
    isPending: m.isPending,
    isError: m.isError,
  };
}
```

- [ ] **Step 4: Rodar — devem passar**

Run: `npx vitest run src/features/ticket-detail/useClaimTicket.test.tsx`
Expected: PASS, 2 testes.

- [ ] **Step 5: Commit**

```bash
git add src/features/ticket-detail/useClaimTicket.ts src/features/ticket-detail/useClaimTicket.test.tsx
git commit -m "feat(ticket-detail): toasts de sucesso/erro em useClaimTicket"
```

---

### Task 8: `useAssignTo` com toasts e nome resolvido

**Files:**

- Modify: `src/features/ticket-detail/useAssignTo.ts`
- Modify: `src/features/ticket-detail/useAssignTo.test.tsx`

- [ ] **Step 1: Atualizar testes**

Substituir `src/features/ticket-detail/useAssignTo.test.tsx` por:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPatch } = vi.hoisted(() => ({ mockPatch: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { PATCH: mockPatch } }));

const { notifySuccess, notifyError } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock("@/lib/notify", () => ({
  notify: {
    success: notifySuccess,
    error: notifyError,
    deferred: vi.fn(),
    commitNow: vi.fn(),
    cancel: vi.fn(),
  },
}));

import { useAssignTo } from "./useAssignTo";
import type { CondoManager } from "./useCondoManagers";

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
const mkClient = (managers: CondoManager[] = []) => {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  qc.setQueryData(["condo-managers", "c1"], managers);
  return qc;
};

afterEach(() => {
  mockPatch.mockReset();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("useAssignTo", () => {
  it("envia { assignee_id }, invalida e mostra toast com nome resolvido", async () => {
    mockPatch.mockResolvedValue({ data: { id: "t1" }, error: undefined });
    const qc = mkClient([
      {
        userId: "u9",
        name: "Ana Silva",
        email: "ana@zivy.local",
        role: "manager",
        label: "Ana Silva",
      },
    ]);
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useAssignTo("t1", "c1"), { wrapper: wrapper(qc) });

    act(() => result.current.assignTo("u9"));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
    expect(mockPatch).toHaveBeenCalledWith("/tickets/{id}/assign-to", {
      params: { path: { id: "t1" } },
      body: { assignee_id: "u9" },
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket", "t1"] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket-events", "t1"] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tickets"] });
      expect(notifySuccess).toHaveBeenCalledWith("Atribuído a Ana Silva");
    });
  });

  it("toast usa label (email-first) do manager", async () => {
    mockPatch.mockResolvedValue({ data: { id: "t1" }, error: undefined });
    const qc = mkClient([
      {
        userId: "u9",
        name: "",
        email: "ana@zivy.local",
        role: "manager",
        label: "ana@zivy.local",
      },
    ]);
    const { result } = renderHook(() => useAssignTo("t1", "c1"), { wrapper: wrapper(qc) });

    act(() => result.current.assignTo("u9"));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith("Atribuído a ana@zivy.local"));
  });

  it("em erro chama notify.error com retry", async () => {
    mockPatch.mockResolvedValue({ data: undefined, error: { message: "x" } });
    const qc = mkClient();
    const { result } = renderHook(() => useAssignTo("t1", "c1"), { wrapper: wrapper(qc) });

    act(() => result.current.assignTo("u9"));

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    const args = notifyError.mock.calls[0];
    expect(args?.[0]).toBe("Não foi possível atribuir");
    expect(args?.[1]).toMatchObject({ retry: expect.any(Function) });
  });
});
```

- [ ] **Step 2: Rodar — devem falhar**

Run: `npx vitest run src/features/ticket-detail/useAssignTo.test.tsx`
Expected: FAIL — assinatura mudou (`condoId` adicionado) e falta toast.

- [ ] **Step 3: Implementar**

Substituir `src/features/ticket-detail/useAssignTo.ts` por:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";
import type { CondoManager } from "./useCondoManagers";

export function useAssignTo(ticketId: string, condoId: string) {
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
          { cause: error },
        );
      }
    },
    onSuccess: (_data, assigneeId) => {
      void qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      void qc.invalidateQueries({ queryKey: ["ticket-events", ticketId] });
      void qc.invalidateQueries({ queryKey: ["tickets"] });
      const managers = qc.getQueryData<CondoManager[]>(["condo-managers", condoId]) ?? [];
      const target = managers.find((p) => p.userId === assigneeId);
      notify.success(`Atribuído a ${target?.label ?? "novo responsável"}`);
    },
    onError: (_e, vars) => {
      notify.error("Não foi possível atribuir", {
        retry: () => m.mutate(vars),
      });
    },
  });

  return {
    assignTo: (assigneeId: string, opts?: { onSuccess?: () => void }) => m.mutate(assigneeId, opts),
    isPending: m.isPending,
    isError: m.isError,
  };
}
```

- [ ] **Step 4: Rodar — devem passar**

Run: `npx vitest run src/features/ticket-detail/useAssignTo.test.tsx`
Expected: PASS, 3 testes.

- [ ] **Step 5: Atualizar call site no `TicketDetailPage`**

Em `src/features/ticket-detail/TicketDetailPage.tsx`, mudar a chamada:

```diff
- const { assignTo, isPending: assigning, isError: assignError } = useAssignTo(ticketId);
+ const { assignTo, isPending: assigning, isError: assignError } = useAssignTo(ticketId, condoId);
```

- [ ] **Step 6: Verificar typecheck**

Run: `npm run typecheck`
Expected: passa.

- [ ] **Step 7: Commit**

```bash
git add src/features/ticket-detail/useAssignTo.ts src/features/ticket-detail/useAssignTo.test.tsx src/features/ticket-detail/TicketDetailPage.tsx
git commit -m "feat(ticket-detail): toasts em useAssignTo com nome email-first"
```

---

### Task 9: `useAddComment` com toasts

**Files:**

- Modify: `src/features/ticket-detail/useAddComment.ts`
- Modify: `src/features/ticket-detail/useAddComment.test.tsx`

- [ ] **Step 1: Atualizar testes**

Substituir `src/features/ticket-detail/useAddComment.test.tsx` por:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));
vi.mock("@/api/client", () => ({ api: { POST: mockPost } }));

const { notifySuccess, notifyError } = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock("@/lib/notify", () => ({
  notify: {
    success: notifySuccess,
    error: notifyError,
    deferred: vi.fn(),
    commitNow: vi.fn(),
    cancel: vi.fn(),
  },
}));

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
  vi.clearAllMocks();
});

describe("useAddComment", () => {
  it("envia { text }, invalida events e mostra toast de sucesso", async () => {
    mockPost.mockResolvedValue({ data: { id: "e1" }, error: undefined });
    const qc = mkClient();
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useAddComment("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.addComment("ok"));

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost).toHaveBeenCalledWith("/tickets/{id}/comments", {
      params: { path: { id: "t1" } },
      body: { text: "ok" },
    });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ticket-events", "t1"] });
      expect(notifySuccess).toHaveBeenCalledWith("Comentário publicado");
    });
  });

  it("em erro chama notify.error com retry", async () => {
    mockPost.mockResolvedValue({ data: undefined, error: { message: "x" } });
    const qc = mkClient();
    const { result } = renderHook(() => useAddComment("t1"), { wrapper: wrapper(qc) });

    act(() => result.current.addComment("ok"));

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    const args = notifyError.mock.calls[0];
    expect(args?.[0]).toBe("Não foi possível publicar");
    expect(args?.[1]).toMatchObject({ retry: expect.any(Function) });
  });
});
```

- [ ] **Step 2: Rodar — devem falhar**

Run: `npx vitest run src/features/ticket-detail/useAddComment.test.tsx`
Expected: FAIL — falta `notify`.

- [ ] **Step 3: Implementar**

Substituir `src/features/ticket-detail/useAddComment.ts` por:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { notify } from "@/lib/notify";

export function useAddComment(ticketId: string) {
  const qc = useQueryClient();
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
          { cause: error },
        );
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ticket-events", ticketId] });
      notify.success("Comentário publicado");
    },
    onError: (_e, vars) => {
      notify.error("Não foi possível publicar", {
        retry: () => m.mutate(vars),
      });
    },
  });

  return {
    addComment: (text: string, opts?: { onSuccess?: () => void }) => m.mutate(text, opts),
    isPending: m.isPending,
    isError: m.isError,
  };
}
```

- [ ] **Step 4: Rodar — devem passar**

Run: `npx vitest run src/features/ticket-detail/useAddComment.test.tsx`
Expected: PASS, 2 testes.

- [ ] **Step 5: Commit**

```bash
git add src/features/ticket-detail/useAddComment.ts src/features/ticket-detail/useAddComment.test.tsx
git commit -m "feat(ticket-detail): toasts de sucesso/erro em useAddComment"
```

---

### Task 10: Estado `pending` no `TicketStatusControl`

**Files:**

- Modify: `src/features/ticket-detail/TicketStatusControl.tsx`
- Modify: `src/features/ticket-detail/TicketStatusControl.module.css`
- Modify: `src/features/ticket-detail/TicketStatusControl.test.tsx`

- [ ] **Step 1: Inspecionar a implementação atual**

Run: `cat src/features/ticket-detail/TicketStatusControl.tsx`
Confirmar a forma — props incluem `status`, `onChange`, `disabled`. Vamos receber também `pendingStatus`.

- [ ] **Step 2: Adicionar teste falho**

Adicionar ao final de `src/features/ticket-detail/TicketStatusControl.test.tsx`:

```tsx
it("aplica classe pending no botão otimista quando pendingStatus é informado", () => {
  render(<TicketStatusControl status="resolved" onChange={() => {}} pendingStatus="resolved" />);
  const btn = screen.getByRole("button", { name: "Resolvido" });
  expect(btn.className).toMatch(/pending/);
});
```

- [ ] **Step 3: Rodar — deve falhar**

Run: `npx vitest run src/features/ticket-detail/TicketStatusControl.test.tsx`
Expected: FAIL — classe `pending` não existe.

- [ ] **Step 4: Adicionar CSS `.pending`**

Adicionar ao final de `src/features/ticket-detail/TicketStatusControl.module.css`:

```css
.pending {
  outline: 2px dashed var(--brand);
  outline-offset: -3px;
}
```

- [ ] **Step 5: Aceitar `pendingStatus` no componente**

Substituir `src/features/ticket-detail/TicketStatusControl.tsx` por:

```tsx
import { TICKET_STATUSES, type TicketStatus } from "@/types/ticket";
import styles from "./TicketStatusControl.module.css";

interface TicketStatusControlProps {
  status: TicketStatus;
  onChange: (status: TicketStatus) => void;
  disabled?: boolean;
  pendingStatus?: TicketStatus;
}

const LABELS: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
};

export function TicketStatusControl({
  status,
  onChange,
  disabled,
  pendingStatus,
}: TicketStatusControlProps) {
  return (
    <div className={styles.control}>
      <div className={styles.label}>Mudar status</div>
      <div className={styles.seg} role="group" aria-label="Mudar status do chamado">
        {TICKET_STATUSES.map((s) => {
          const isActive = s === status;
          const isPending = pendingStatus !== undefined && s === pendingStatus;
          const classes = [
            styles.segButton ?? "",
            isActive ? (styles.active ?? "") : "",
            isPending ? (styles.pending ?? "") : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={s}
              type="button"
              className={classes}
              aria-pressed={isActive}
              disabled={disabled}
              onClick={() => {
                // Mantém o guard original: clicar no status já ativo é no-op.
                // Durante a janela de undo o otimista já marcou o alvo como ativo,
                // então re-cliques no mesmo alvo não re-agendam o deferred.
                if (!isActive) onChange(s);
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

- [ ] **Step 6: Rodar — deve passar**

Run: `npx vitest run src/features/ticket-detail/TicketStatusControl.test.tsx`
Expected: PASS (todos os testes, incluindo o novo).

- [ ] **Step 7: Repassar `pendingStatus` e exibir o status efetivo**

No modelo de estado local, o cache do ticket **não** é tocado durante a janela — o componente exibe `pendingStatus ?? data.status`. Em `src/features/ticket-detail/TicketDetailPage.tsx`:

**(a)** Depois das early returns de loading/erro (onde `data` já existe garantido), antes do `return` do JSX principal, calcular o status efetivo:

```tsx
const effectiveStatus = pendingStatus ?? data.status;
```

**(b)** Trocar o `StatusBadge` do header para o status efetivo:

```diff
- <StatusBadge status={data.status} />
+ <StatusBadge status={effectiveStatus} />
```

**(c)** Atualizar o `TicketStatusControl`:

```diff
  <TicketStatusControl
-   status={data.status}
+   status={effectiveStatus}
    onChange={(s) => updateStatus(s)}
-   disabled={pendingStatus !== undefined}
+   pendingStatus={pendingStatus}
  />
```

(Removemos `disabled` — durante a janela de undo o status segue clicável para trocas rápidas; o `if (!isActive)` do componente evita re-agendar o mesmo alvo, e `notify.deferred` coalesce alvos diferentes. Como `status={effectiveStatus}`, o botão do alvo pendente já aparece como ativo **e** com o outline tracejado.)

- [ ] **Step 8: Verificar typecheck**

Run: `npm run typecheck`
Expected: passa.

- [ ] **Step 9: Commit**

```bash
git add src/features/ticket-detail/TicketStatusControl.tsx src/features/ticket-detail/TicketStatusControl.module.css src/features/ticket-detail/TicketStatusControl.test.tsx src/features/ticket-detail/TicketDetailPage.tsx
git commit -m "feat(ticket-detail): estado visual pending no segmented control"
```

---

### Task 11: Limpar feedback inline do `TicketDetailPage`

**Files:**

- Modify: `src/features/ticket-detail/TicketDetailPage.tsx`
- Modify: `src/features/ticket-detail/TicketDetailPage.module.css`
- Modify: `src/features/ticket-detail/TicketDetailPage.test.tsx`

- [ ] **Step 1: Atualizar `TicketDetailPage.test.tsx`**

O arquivo **mocka todos os hooks** (`mockUseUpdateStatus` etc.), então a página nunca chama `notify` diretamente — exceto o `commitNow` no cleanup do `useEffect`. Logo: (a) os asserts de erro inline somem, (b) adiciona-se um mock de `@/lib/notify`, (c) testa-se o `commitNow` no unmount.

**(a) Remover os 3 testes de alerta de mutation** — `"mostra alerta quando uma escrita no ticket (status/assumir/atribuir) falha"`, `"mostra alerta quando publicar comentário falha"` e `"não mostra alerta de erro quando as mutations estão ok"`. Esses dependiam do `isError` → `role="alert"` que deixa de existir. (Os testes de loading e de erro de **carregamento** do ticket — `"mostra loading"`, `"mostra erro com tentar novamente"`, `"chama onClose pelo 'Voltar para chamados'"` — permanecem.)

**(b) Adicionar o mock de `@/lib/notify`** junto aos demais `vi.mock` do topo do arquivo (depois do bloco `vi.hoisted` existente):

```tsx
const { mockCommitNow } = vi.hoisted(() => ({ mockCommitNow: vi.fn() }));
vi.mock("@/lib/notify", () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    deferred: vi.fn(),
    commitNow: mockCommitNow,
    cancel: vi.fn(),
  },
}));
```

**(c) Adicionar o teste de cleanup** (dentro do `describe("TicketDetailPage", ...)`):

```tsx
it("no unmount, commita uma mudança de status pendente (commitNow)", () => {
  const { unmount } = render(<TicketDetailPage condoId="c1" ticketId="t1" onClose={vi.fn()} />);
  unmount();
  expect(mockCommitNow).toHaveBeenCalledWith("ticket-status-t1");
});
```

- [ ] **Step 2: Rodar para checar baseline**

Run: `npx vitest run src/features/ticket-detail/TicketDetailPage.test.tsx`
Expected: alguns testes podem falhar nesta etapa — é esperado e será resolvido nos próximos steps.

- [ ] **Step 3: Remover `writeError`/`commentError` do componente e adicionar cleanup**

Em `src/features/ticket-detail/TicketDetailPage.tsx`:

- **Remover** as variáveis `writeError` e os dois blocos `<p className={styles.writeError} role="alert">`.
- **Remover** `isError: statusError, isError: claimError, isError: assignError, isError: commentError` dos hooks (não são mais consumidos).
- **Adicionar** o effect de cleanup:

```tsx
import { useEffect } from "react";
import { notify } from "@/lib/notify";

// dentro do componente, no topo:
useEffect(
  () => () => {
    notify.commitNow(`ticket-status-${ticketId}`);
  },
  [ticketId],
);
```

- [ ] **Step 4: Remover `.writeError` do CSS**

Em `src/features/ticket-detail/TicketDetailPage.module.css`, remover o bloco `.writeError { ... }`.

- [ ] **Step 5: Rodar testes da página**

Run: `npx vitest run src/features/ticket-detail/TicketDetailPage.test.tsx`
Expected: PASS (asserts de erro inline removidos; novo teste de `commitNow` no unmount passa).

- [ ] **Step 6: Suite completa + lint + typecheck**

Run: `npm run lint && npm run typecheck && npm run test`
Expected: tudo passa.

- [ ] **Step 7: Commit**

```bash
git add src/features/ticket-detail/TicketDetailPage.tsx src/features/ticket-detail/TicketDetailPage.module.css src/features/ticket-detail/TicketDetailPage.test.tsx
git commit -m "refactor(ticket-detail): remove feedback inline em favor de toasts"
```

---

### Task 12: Build + smoke manual + push

- [ ] **Step 1: Build production**

Run: `npm run build`
Expected: passa; nenhum chunk novo gigante (sonner é ~5KB).

- [ ] **Step 2: Smoke manual no dev**

Run: `npm run dev` em outro terminal.

Cenários a validar (com gestor logado):

1. Abrir um ticket. Clicar "Resolvido" → badge muda para Resolvido com outline tracejado; toast bottom-right "Status alterado para Resolvido" com botão Desfazer.
2. Clicar Desfazer antes dos 5s → badge volta, toast some, **nenhum** PATCH disparado (checar Network tab).
3. Clicar "Resolvido" → esperar 5s → PATCH dispara, badge consolida, outline some.
4. Clicar "Resolvido" → 2s depois clicar "Em andamento" → toast atualiza, 1 PATCH final.
5. Fechar o modal antes dos 5s → PATCH dispara mesmo assim.
6. Comentar "teste" → toast "Comentário publicado".
7. Simular erro (`Network: Offline` no DevTools) → clicar "Resolvido" → após commit → toast vermelho "Não foi possível alterar status" com botão "Tentar novamente".
8. Trocar theme dark/light → toasts respeitam.

- [ ] **Step 3: Atualizar PR (se continuar na branch atual)**

Se a branch é `feature/plan-7-toasts-status-undo`, abrir PR contra `develop`:

```bash
git push -u origin feature/plan-7-toasts-status-undo
gh pr create --title "feat(plan-7): toasts + delay/undo na mudança de status" --body "$(cat <<'EOF'
## Summary
- Adapter `src/lib/notify.ts` (sonner) com `success`, `error`, `deferred`, `commitNow`, `cancel`.
- Padrão delay+undo de 5s em `useUpdateStatus` (otimismo via estado local, PATCH só após o timer).
- Toasts de sucesso/erro em `useClaimTicket`, `useAssignTo`, `useAddComment` (com retry).
- Estado visual `.pending` no `TicketStatusControl` (outline tracejado).
- Remove `writeError`/`commentError` inline da `TicketDetailPage`.

Spec: `docs/superpowers/specs/2026-05-28-toasts-status-undo-design.md`.

## Test plan
- [x] Adapter: fake timers + mock de `sonner`.
- [x] Hooks: `vi.mock("@/lib/notify")` + asserts de chamadas.
- [x] Componente: classe `.pending` aplicada.
- [ ] Smoke manual: cenários 1–8 listados no plan.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Se for continuação da branch atual (`feature/plan-6-5-ticket-detail`), apenas push: `git push`.

---

## Self-Review

### Spec coverage

| Requisito da spec                                   | Coberto por                                                            |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| Adapter `notify.ts` com 5 métodos                   | Task 2 (success) + Task 3 (error) + Task 4 (deferred/cancel/commitNow) |
| Toaster em `providers.tsx`                          | Task 5                                                                 |
| Delay+undo em status (5s)                           | Task 6                                                                 |
| Coalescência de cliques rápidos                     | Task 4 (deferred com mesmo id) — testado                               |
| Fechar modal commita                                | Task 11 (useEffect cleanup com `commitNow`)                            |
| Toasts em claim/assign/comment                      | Tasks 7, 8, 9                                                          |
| Estado visual `.pending`                            | Task 10                                                                |
| Remove `writeError`/`commentError`                  | Task 11                                                                |
| Sem env import em `notify.ts`                       | Implementação Task 4 — só importa `sonner`                             |
| Testes `vi.mock` + `vi.hoisted` para `@/lib/notify` | Tasks 6–9                                                              |
| A11y: aria-pressed mantido                          | Task 10 (componente preserva `aria-pressed`)                           |
| Tema reativo no Toaster                             | Task 5                                                                 |

### Placeholder scan

Nenhum "TBD"/"TODO"/"similar to Task N"/"implement later". Todo step tem código ou comando concreto. ✓

### Type consistency

- `LABEL` (no `useUpdateStatus`) e `LABELS` (no `TicketStatusControl`) — nomes diferentes propositadamente: um é constante do hook, outro do componente. Ambos com mesmo shape `Record<TicketStatus, string>`. ✓
- `notify.deferred(id, message, opts)` — assinatura idêntica em todos os call sites e testes. ✓
- `useAssignTo(ticketId, condoId)` — assinatura nova, atualizada no call site da `TicketDetailPage` no Task 8 Step 5. ✓
- `CondoManager` shape (userId/name/email/role) usado em Task 8 — confere com `src/features/ticket-detail/useCondoManagers.ts`. ✓

---
