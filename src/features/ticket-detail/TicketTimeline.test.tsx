import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TicketTimeline } from "./TicketTimeline";
import { toTicketEvent, type TicketEvent } from "@/types/ticketEvent";

const comment = toTicketEvent({
  id: "e1",
  ticket_id: "t1",
  event_type: "comment_added",
  actor_type: "manager",
  created_at: "2026-05-20T10:00:00Z",
  payload: { text: "Equipe a caminho" },
}) as TicketEvent;

const statusEv = toTicketEvent({
  id: "e2",
  ticket_id: "t1",
  event_type: "status_changed",
  actor_type: "manager",
  created_at: "2026-05-20T09:00:00Z",
  payload: { from: "open", to: "in_progress" },
}) as TicketEvent;

describe("TicketTimeline", () => {
  it("mostra item created UI-only no topo", () => {
    render(<TicketTimeline events={[]} ticketCreatedAt="2026-05-20T08:00:00Z" />);
    expect(screen.getByText(/abriu o chamado/i)).toBeInTheDocument();
  });

  it("renderiza o corpo de um comentário", () => {
    render(<TicketTimeline events={[comment]} ticketCreatedAt="2026-05-20T08:00:00Z" />);
    expect(screen.getByText("Equipe a caminho")).toBeInTheDocument();
  });

  it("renderiza status_changed com badges from/to", () => {
    render(<TicketTimeline events={[statusEv]} ticketCreatedAt={undefined} />);
    expect(screen.getByText("Aberto")).toBeInTheDocument();
    expect(screen.getByText("Em andamento")).toBeInTheDocument();
  });

  it("usa label por actor_type quando não há managers (sem fabricar nome)", () => {
    render(<TicketTimeline events={[comment]} ticketCreatedAt={undefined} />);
    expect(screen.getByText("Gestor")).toBeInTheDocument();
  });

  it("resolve actor_id → nome real do manager (name)", () => {
    const ev = toTicketEvent({
      id: "e3",
      ticket_id: "t1",
      event_type: "assigned",
      actor_type: "manager",
      actor_id: "u-ana",
      created_at: "2026-05-20T09:30:00Z",
      payload: {},
    }) as TicketEvent;
    render(
      <TicketTimeline
        events={[ev]}
        ticketCreatedAt={undefined}
        managers={[
          {
            userId: "u-ana",
            email: "ana@ex.com",
            name: "Ana Silva",
            role: "manager",
            label: "Ana Silva",
          },
        ]}
      />,
    );
    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
    expect(screen.queryByText("Gestor")).toBeNull();
  });

  it("cai pro email quando o manager não tem nome", () => {
    const ev = toTicketEvent({
      id: "e4",
      ticket_id: "t1",
      event_type: "assigned",
      actor_type: "manager",
      actor_id: "u-bob",
      created_at: "2026-05-20T09:30:00Z",
      payload: {},
    }) as TicketEvent;
    render(
      <TicketTimeline
        events={[ev]}
        ticketCreatedAt={undefined}
        managers={[
          { userId: "u-bob", email: "bob@ex.com", name: "", role: "staff", label: "bob@ex.com" },
        ]}
      />,
    );
    expect(screen.getByText("bob@ex.com")).toBeInTheDocument();
  });

  it("empty state quando não há nada", () => {
    render(<TicketTimeline events={[]} ticketCreatedAt={undefined} />);
    expect(screen.getByText(/sem eventos/i)).toBeInTheDocument();
  });
});
