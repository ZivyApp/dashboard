import type { Meta, StoryObj } from "@storybook/react";
import { PriorityChip } from "./PriorityChip";

const meta = {
  title: "UI/PriorityChip",
  component: PriorityChip,
} satisfies Meta<typeof PriorityChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Low: Story = { args: { priority: "low" } };
export const Medium: Story = { args: { priority: "medium" } };
export const High: Story = { args: { priority: "high" } };

export const Todos: Story = {
  args: { priority: "low" },
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <PriorityChip priority="low" />
      <PriorityChip priority="medium" />
      <PriorityChip priority="high" />
    </div>
  ),
};
