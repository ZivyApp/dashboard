import styles from "./StatusBadge.module.css";
import type { TicketStatus } from "@/features/tickets/types";

export type { TicketStatus };

interface StatusBadgeProps {
  status: TicketStatus;
}

const LABELS: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
};

const VARIANT_CLASS: Record<TicketStatus, string> = {
  open: styles.open ?? "",
  in_progress: styles.in_progress ?? "",
  resolved: styles.resolved ?? "",
  closed: styles.closed ?? "",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = LABELS[status] ?? status;
  const variantCls = VARIANT_CLASS[status] ?? styles.unknown ?? "";
  const cls = [styles.badge, variantCls].filter(Boolean).join(" ");
  return <span className={cls}>{label}</span>;
}
