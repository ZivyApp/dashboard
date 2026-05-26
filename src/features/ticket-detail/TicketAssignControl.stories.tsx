import type { Meta, StoryObj } from "@storybook/react";
import { Modal } from "@/ui/Modal/Modal";
import { TicketAssignControl } from "./TicketAssignControl";
import type { CondoManager } from "./useCondoManagers";

const managers: CondoManager[] = [
  { userId: "me", email: "me@ex.com", name: "Eu", role: "manager", label: "Eu" },
  { userId: "ana", email: "ana@ex.com", name: "Ana Silva", role: "manager", label: "Ana Silva" },
  { userId: "bob", email: "bob@ex.com", name: "Bob Souza", role: "staff", label: "Bob Souza" },
];

const meta: Meta<typeof TicketAssignControl> = {
  title: "TicketDetail/TicketAssignControl",
  component: TicketAssignControl,
  args: {
    assignedTo: undefined,
    managers,
    currentUserId: "me",
    canManage: true,
    isClaiming: false,
    isAssigning: false,
    onClaim: () => {},
    onAssignTo: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof TicketAssignControl>;

export const Default: Story = {};

// Contexto real: o controle vive no topo de uma TicketDetailPage alta dentro de
// um Modal (Dialog). O picker "Atribuir a outro" abre SOBRE o corpo do dialog —
// guarda a regressão de z-index (o conteúdo do dropdown precisa ficar acima do
// modal, senão abre escondido atrás dele).
export const DentroDoModal: Story = {
  render: (args) => (
    <Modal open size="lg" title="Detalhe do chamado" onClose={() => {}}>
      <TicketAssignControl {...args} />
      <div style={{ height: "600px", paddingTop: "16px", color: "var(--fg-tertiary)" }}>
        (conteúdo alto simulando descrição + timeline + composer)
      </div>
    </Modal>
  ),
};
