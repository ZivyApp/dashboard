import { Bell, Send, Shield, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityKind } from "./repository/types";

const ICONS: Record<ActivityKind, LucideIcon> = {
  ticket_new: Bell,
  ticket_comment: Send,
  approval: Shield,
  status_change: Check,
};

export function iconFor(kind: ActivityKind): LucideIcon {
  return ICONS[kind];
}
