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
