import type { Meta, StoryObj } from "@storybook/react";
import { StatusBadge } from "./StatusBadge";

const meta = {
  title: "UI/StatusBadge",
  component: StatusBadge,
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = { args: { status: "open" } };
export const InProgress: Story = { args: { status: "in_progress" } };
export const Resolved: Story = { args: { status: "resolved" } };
export const Closed: Story = { args: { status: "closed" } };

export const Todos: Story = {
  args: { status: "open" },
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <StatusBadge status="open" />
      <StatusBadge status="in_progress" />
      <StatusBadge status="resolved" />
      <StatusBadge status="closed" />
    </div>
  ),
};
