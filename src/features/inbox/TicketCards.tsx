import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { PriorityChip } from "@/ui/PriorityChip/PriorityChip";
import type { Ticket } from "./filterTickets";
import { formatRelTime } from "./formatRelTime";
import styles from "./TicketCards.module.css";

interface TicketCardsProps {
  tickets: Ticket[];
  onPick: (ticketId: string) => void;
}

export function TicketCards({ tickets, onPick }: TicketCardsProps) {
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
