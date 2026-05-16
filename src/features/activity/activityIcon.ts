import { Bell, Send, Shield, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityKind } from "./repository/types";

export interface KindVisual {
  icon: LucideIcon;
  bg: string; // var(--token)
  fg: string; // var(--token)
}

const MAP: Record<ActivityKind, KindVisual> = {
  ticket_new: { icon: Bell, bg: "var(--info-bg)", fg: "var(--info-fg)" },
  ticket_comment: { icon: Send, bg: "var(--brand-soft)", fg: "var(--brand)" },
  approval: { icon: Shield, bg: "var(--status-onhold-bg)", fg: "var(--status-onhold-fg)" },
  status_change: { icon: Check, bg: "var(--status-media-bg)", fg: "var(--status-media-fg)" },
};

export function visualFor(kind: ActivityKind): KindVisual {
  return MAP[kind];
}
