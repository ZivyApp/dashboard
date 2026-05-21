import type { Meta, StoryObj } from "@storybook/react";
import { CondoCard } from "./CondoCard";

const meta: Meta<typeof CondoCard> = {
  title: "Overview/CondoCard",
  component: CondoCard,
  args: {
    condo: { condoId: "c1", condoName: "Solar das Flores", condoSlug: "solar", role: "manager" },
    stats: { open: 3, inProgress: 2, resolved: 5, urgent: 1 },
    onFocus: () => undefined,
  },
};
export default meta;

type Story = StoryObj<typeof CondoCard>;

export const Default: Story = {};
export const SemUrgentes: Story = {
  args: { stats: { open: 1, inProgress: 0, resolved: 4, urgent: 0 } },
};
