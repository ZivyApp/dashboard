import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { TicketAssignControl } from "./TicketAssignControl";
import type { CondoManager } from "./useCondoManagers";

const managers: CondoManager[] = [
  { userId: "me", email: "me@ex.com", name: "Eu", role: "manager", label: "Eu" },
  { userId: "ana", email: "ana@ex.com", name: "Ana", role: "manager", label: "Ana" },
  { userId: "bob", email: "bob@ex.com", name: "", role: "staff", label: "bob@ex.com" },
];

function setup(props: Partial<ComponentProps<typeof TicketAssignControl>> = {}) {
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
  it("mostra botão 'Assumir ticket' (habilitado) quando não atribuído", () => {
    setup();
    expect(screen.getByRole("button", { name: /assumir ticket/i })).toBeEnabled();
  });

  it("botão vira 'Atribuído a você' (desabilitado) quando o ticket é do usuário logado", () => {
    setup({ assignedTo: "me" });
    const btn = screen.getByRole("button", { name: /atribuído a você/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
    expect(screen.queryByRole("button", { name: /assumir ticket/i })).toBeNull();
  });

  it("quando atribuído a outro, mantém 'Assumir ticket' habilitado (reassumir)", () => {
    setup({ assignedTo: "bob" });
    expect(screen.getByRole("button", { name: /assumir ticket/i })).toBeEnabled();
  });

  it("assume direto (sem confirmação) quando o ticket não tem responsável", async () => {
    const onClaim = vi.fn();
    setup({ onClaim });
    await userEvent.click(screen.getByRole("button", { name: /assumir ticket/i }));
    expect(onClaim).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ao reassumir de outro gestor, abre diálogo de confirmação (sem chamar onClaim ainda)", async () => {
    const onClaim = vi.fn();
    setup({ assignedTo: "bob", onClaim });
    await userEvent.click(screen.getByRole("button", { name: /assumir ticket/i }));
    expect(onClaim).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // mostra de quem o chamado está sendo tirado (label do responsável atual)
    expect(screen.getAllByText("bob@ex.com").length).toBeGreaterThan(0);
  });

  it("confirmar no diálogo dispara onClaim e fecha", async () => {
    const onClaim = vi.fn();
    setup({ assignedTo: "bob", onClaim });
    await userEvent.click(screen.getByRole("button", { name: /assumir ticket/i }));
    await userEvent.click(screen.getByRole("button", { name: /assumir mesmo assim/i }));
    expect(onClaim).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cancelar no diálogo não dispara onClaim", async () => {
    const onClaim = vi.fn();
    setup({ assignedTo: "bob", onClaim });
    await userEvent.click(screen.getByRole("button", { name: /assumir ticket/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onClaim).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
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

  it("escolher no picker abre confirmação (sem chamar onAssignTo ainda)", async () => {
    const onAssignTo = vi.fn();
    setup({ onAssignTo });
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /atribuir a outro/i }),
      "ana",
    );
    expect(onAssignTo).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // mostra a quem está sendo atribuído (label do escolhido)
    expect(screen.getAllByText("Ana").length).toBeGreaterThan(0);
  });

  it("confirmar a atribuição dispara onAssignTo e fecha", async () => {
    const onAssignTo = vi.fn();
    setup({ onAssignTo });
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /atribuir a outro/i }),
      "ana",
    );
    await userEvent.click(screen.getByRole("button", { name: /^atribuir$/i }));
    expect(onAssignTo).toHaveBeenCalledWith("ana");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cancelar a atribuição não dispara onAssignTo", async () => {
    const onAssignTo = vi.fn();
    setup({ onAssignTo });
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /atribuir a outro/i }),
      "ana",
    );
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onAssignTo).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("esconde controles de escrita quando não pode gerenciar (mas mostra responsável)", () => {
    setup({ canManage: false, assignedTo: "ana" });
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /assumir ticket/i })).toBeNull();
    expect(screen.queryByRole("combobox", { name: /atribuir a outro/i })).toBeNull();
  });
});
