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

const trigger = () => screen.getByRole("button", { name: /responsável pelo chamado/i });

describe("TicketAssignControl", () => {
  it("trigger mostra 'Não atribuído' quando não há responsável", () => {
    setup();
    expect(trigger()).toHaveTextContent("Não atribuído");
  });

  it("trigger mostra o nome do responsável atual", () => {
    setup({ assignedTo: "ana" });
    expect(trigger()).toHaveTextContent("Ana");
  });

  it("lista todos os gestores com cargo em pt-BR", async () => {
    setup();
    await userEvent.click(trigger());
    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(3);
    expect(screen.getAllByText("Síndico").length).toBeGreaterThan(0);
    expect(screen.getByText("Zelador")).toBeInTheDocument();
  });

  it("sem responsável, escolher a si mesmo assume direto (sem confirmação)", async () => {
    const onClaim = vi.fn();
    setup({ onClaim });
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitem", { name: /eu \(você\)/i }));
    expect(onClaim).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sem responsável, escolher outro atribui direto (sem confirmação)", async () => {
    const onAssignTo = vi.fn();
    setup({ onAssignTo });
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitem", { name: /ana/i }));
    expect(onAssignTo).toHaveBeenCalledWith("ana");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("com responsável, escolher outro abre confirmação e só atribui ao confirmar", async () => {
    const onAssignTo = vi.fn();
    setup({ assignedTo: "bob", onAssignTo });
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitem", { name: /ana/i }));
    expect(onAssignTo).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // mostra de quem está sendo tirado (responsável atual)
    expect(screen.getAllByText("bob@ex.com").length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: /^atribuir$/i }));
    expect(onAssignTo).toHaveBeenCalledWith("ana");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("com responsável de outro, escolher a si mesmo abre confirmação de assumir", async () => {
    const onClaim = vi.fn();
    setup({ assignedTo: "bob", onClaim });
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitem", { name: /eu \(você\)/i }));
    expect(onClaim).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /assumir mesmo assim/i }));
    expect(onClaim).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("escolher o responsável atual é no-op", async () => {
    const onAssignTo = vi.fn();
    const onClaim = vi.fn();
    setup({ assignedTo: "ana", onAssignTo, onClaim });
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitem", { name: /ana/i }));
    expect(onAssignTo).not.toHaveBeenCalled();
    expect(onClaim).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cancelar a confirmação não dispara ação", async () => {
    const onAssignTo = vi.fn();
    setup({ assignedTo: "bob", onAssignTo });
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitem", { name: /ana/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onAssignTo).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("modo leitura mostra nome + cargo, sem dropdown", () => {
    setup({ canManage: false, assignedTo: "ana" });
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Síndico")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /responsável pelo chamado/i })).toBeNull();
  });

  it("modo leitura sem responsável mostra 'Não atribuído'", () => {
    setup({ canManage: false, assignedTo: undefined });
    expect(screen.getByText("Não atribuído")).toBeInTheDocument();
  });
});
