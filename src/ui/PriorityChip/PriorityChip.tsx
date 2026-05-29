import { Signal, SignalHigh, SignalLow, SignalMedium, type LucideIcon } from "lucide-react";
import styles from "./PriorityChip.module.css";
import type { TicketPriority } from "@/types/ticket";

export type { TicketPriority };

interface PriorityChipProps {
  priority: TicketPriority;
}

const LABELS: Record<TicketPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

const ICONS: Record<TicketPriority, LucideIcon> = {
  low: SignalLow,
  medium: SignalMedium,
  high: SignalHigh,
};

const VARIANT_CLASS: Record<TicketPriority, string> = {
  low: styles.low ?? "",
  medium: styles.medium ?? "",
  high: styles.high ?? "",
};

export function PriorityChip({ priority }: PriorityChipProps) {
  const label = LABELS[priority] ?? priority;
  const Icon = ICONS[priority] ?? Signal;
  const variantCls = VARIANT_CLASS[priority] ?? styles.unknown ?? "";
  const cls = [styles.chip, variantCls].filter(Boolean).join(" ");
  return (
    <span className={cls}>
      <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  );
}
