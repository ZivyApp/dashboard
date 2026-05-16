import type { Meta, StoryObj } from "@storybook/react";
import { RoleBadge } from "./RoleBadge";

const meta: Meta<typeof RoleBadge> = { title: "AppShell/RoleBadge", component: RoleBadge };
export default meta;

export const SuperAdmin: StoryObj<typeof RoleBadge> = { args: { role: "super_admin" } };
export const Manager: StoryObj<typeof RoleBadge> = { args: { role: "manager" } };
export const Staff: StoryObj<typeof RoleBadge> = { args: { role: "staff" } };
export const Viewer: StoryObj<typeof RoleBadge> = { args: { role: "viewer" } };
