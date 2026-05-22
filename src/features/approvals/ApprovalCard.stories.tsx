import type { Meta, StoryObj } from "@storybook/react";
import { ApprovalCard } from "./ApprovalCard";

const meta = {
  title: "Approvals/ApprovalCard",
  component: ApprovalCard,
} satisfies Meta<typeof ApprovalCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
  args: {
    resident: {
      id: "r1",
      name: "Lucas Ferreira",
      condoId: "c1",
      condoName: "Residencial Jardins",
      phone: "+5511999994312",
      createdAt: "2026-05-12T07:40:00Z",
    },
    onApprove: () => undefined,
    onReject: () => undefined,
  },
};
