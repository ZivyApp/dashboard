import { Circle, CircleCheck, CircleDot, CircleX, Clock, type LucideIcon } from "lucide-react";
import styles from "./StatusBadge.module.css";
import { STATUS_LABELS, type TicketStatus } from "@/types/ticket";

export type { TicketStatus };

interface StatusBadgeProps {
  status: TicketStatus;
}

const ICONS: Record<TicketStatus, LucideIcon> = {
  open: CircleDot,
  in_progress: Clock,
  resolved: CircleCheck,
  closed: CircleX,
};

const VARIANT_CLASS: Record<TicketStatus, string> = {
  open: styles.open ?? "",
  in_progress: styles.in_progress ?? "",
  resolved: styles.resolved ?? "",
  closed: styles.closed ?? "",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = STATUS_LABELS[status] ?? status;
  const Icon = ICONS[status] ?? Circle;
  const variantCls = VARIANT_CLASS[status] ?? styles.unknown ?? "";
  const cls = [styles.badge, variantCls].filter(Boolean).join(" ");
  return (
    <span className={cls}>
      <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  );
}
