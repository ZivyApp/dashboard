import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { PriorityChip } from "@/ui/PriorityChip/PriorityChip";
import type { Ticket } from "./types";
import { formatRelTime } from "@/lib/formatRelTime";
import styles from "./TicketsCards.module.css";

interface TicketsCardsProps {
  tickets: Ticket[];
  onPick: (ticketId: string) => void;
}

export function TicketsCards({ tickets, onPick }: TicketsCardsProps) {
  return (
    <div className={styles.list}>
      {tickets.map((t) => (
        <button key={t.id} type="button" className={styles.card} onClick={() => onPick(t.id)}>
          <div className={styles.title}>{t.title}</div>
          <div className={styles.row}>
            <span className={styles.proto}>{t.protocol}</span>
            <PriorityChip priority={t.priority} />
          </div>
          <div className={styles.row}>
            <StatusBadge status={t.status} />
            <span className={styles.time}>{formatRelTime(t.updated_at)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
