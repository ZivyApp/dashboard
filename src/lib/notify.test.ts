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
    expect(sonnerError.mock.calls[0]?.[1]).not.toHaveProperty("action");
  });
});

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
    const actionMatcher = expect.objectContaining({ label: "Desfazer" }) as object;
    expect(sonnerToast).toHaveBeenCalledWith(
      "Aplicando",
      expect.objectContaining({
        id: "id-1",
        duration: 5000,
        action: actionMatcher,
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
