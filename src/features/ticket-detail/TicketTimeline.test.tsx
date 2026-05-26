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

  it("usa label por actor_type (sem fabricar nome)", () => {
    render(<TicketTimeline events={[comment]} ticketCreatedAt={undefined} />);
    expect(screen.getByText("Gestor")).toBeInTheDocument();
  });

  it("empty state quando não há nada", () => {
    render(<TicketTimeline events={[]} ticketCreatedAt={undefined} />);
    expect(screen.getByText(/sem eventos/i)).toBeInTheDocument();
  });
});
