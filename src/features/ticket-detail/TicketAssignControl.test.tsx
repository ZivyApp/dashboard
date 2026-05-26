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
  it("mostra 'Não atribuído' e botão Assumir quando vazio", () => {
    setup();
    expect(screen.getByText(/não atribuído/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /assumir ticket/i })).toBeInTheDocument();
  });

  it("resolve o responsável pelo label (email-first)", () => {
    setup({ assignedTo: "bob" });
    expect(screen.getByText("bob@ex.com")).toBeInTheDocument();
  });

  it("dispara onClaim ao assumir", async () => {
    const onClaim = vi.fn();
    setup({ onClaim });
    await userEvent.click(screen.getByRole("button", { name: /assumir ticket/i }));
    expect(onClaim).toHaveBeenCalled();
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

  it("dispara onAssignTo ao escolher no picker", async () => {
    const onAssignTo = vi.fn();
    setup({ onAssignTo });
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /atribuir a outro/i }),
      "ana",
    );
    expect(onAssignTo).toHaveBeenCalledWith("ana");
  });

  it("esconde controles de escrita quando não pode gerenciar (mas mostra responsável)", () => {
    setup({ canManage: false, assignedTo: "ana" });
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /assumir ticket/i })).toBeNull();
    expect(screen.queryByRole("combobox", { name: /atribuir a outro/i })).toBeNull();
  });
});
