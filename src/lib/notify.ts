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
