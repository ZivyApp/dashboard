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
    expect(onSubmit).toHaveBeenCalledOnce();
    const lastCall = onSubmit.mock.lastCall;
    expect(lastCall?.[0]).toBe("Olá");
    expect(lastCall?.[1]).toHaveProperty("onSuccess", expect.any(Function));
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
