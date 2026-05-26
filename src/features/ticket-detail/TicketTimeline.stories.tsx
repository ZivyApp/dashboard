import type { Meta, StoryObj } from "@storybook/react";
import { TicketTimeline } from "./TicketTimeline";
import { toTicketEvent, type TicketEvent } from "@/types/ticketEvent";

const events = [
  toTicketEvent({
    id: "e1",
    ticket_id: "t1",
    event_type: "status_changed",
    actor_type: "manager",
    created_at: "2026-05-20T09:00:00Z",
    payload: { from: "open", to: "in_progress" },
  }),
  toTicketEvent({
    id: "e2",
    ticket_id: "t1",
    event_type: "assigned",
    actor_type: "manager",
    actor_id: "u-ana",
    created_at: "2026-05-20T09:05:00Z",
    payload: {},
  }),
  toTicketEvent({
    id: "e3",
    ticket_id: "t1",
    event_type: "comment_added",
    actor_type: "manager",
    created_at: "2026-05-20T10:00:00Z",
    payload: { text: "Equipe a caminho, chega em 30 min." },
  }),
].filter((e): e is TicketEvent => e !== null);

const meta: Meta<typeof TicketTimeline> = {
  title: "TicketDetail/TicketTimeline",
  component: TicketTimeline,
};
export default meta;
type Story = StoryObj<typeof TicketTimeline>;

const managers = [
  {
    userId: "u-ana",
    email: "ana@ex.com",
    name: "Ana Silva",
    role: "manager" as const,
    label: "Ana Silva",
  },
];

export const Default: Story = {
  args: { events, ticketCreatedAt: "2026-05-20T08:00:00Z", managers },
};
export const Empty: Story = { args: { events: [], ticketCreatedAt: undefined } };
