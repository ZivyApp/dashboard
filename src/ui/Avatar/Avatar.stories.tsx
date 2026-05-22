import type { Meta, StoryObj } from "@storybook/react";
import { Avatar } from "./Avatar";

const meta = {
  title: "UI/Avatar",
  component: Avatar,
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Medio: Story = { args: { name: "Lucas Ferreira", size: "md" } };
export const Grande: Story = { args: { name: "Ana Beatriz", size: "lg" } };
