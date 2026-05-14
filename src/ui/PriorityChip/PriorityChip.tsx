import styles from "./PriorityChip.module.css";
import type { TicketPriority } from "@/features/inbox/types";

export type { TicketPriority };

interface PriorityChipProps {
  priority: TicketPriority;
}

const LABELS: Record<TicketPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

const VARIANT_CLASS: Record<TicketPriority, string> = {
  low: styles.low ?? "",
  medium: styles.medium ?? "",
  high: styles.high ?? "",
};

export function PriorityChip({ priority }: PriorityChipProps) {
  const label = LABELS[priority] ?? priority;
  const variantCls = VARIANT_CLASS[priority] ?? styles.unknown ?? "";
  const cls = [styles.chip, variantCls].filter(Boolean).join(" ");
  return <span className={cls}>{label}</span>;
}
