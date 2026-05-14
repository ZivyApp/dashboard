import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "@/ui/Button/Button";

const meta = {
  title: "UI/Modal",
  component: Modal,
  args: {
    open: false,
    onClose: () => {},
    title: "Detalhes do ticket",
    children: <p>Conteúdo da modal aqui.</p>,
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

function PadraoTemplate() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Abrir modal</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Detalhes do ticket">
        <p>Conteúdo da modal aqui.</p>
      </Modal>
    </>
  );
}

export const Padrao: Story = {
  render: () => <PadraoTemplate />,
};
