import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { PriorityChip } from "@/ui/PriorityChip/PriorityChip";
import { formatRelTime } from "@/lib/formatRelTime";
import type { Ticket, TicketStatus } from "./types";
import styles from "./TicketsKanban.module.css";

interface Column {
  id: TicketStatus;
  label: string;
}

const COLUMNS: Column[] = [
  { id: "open", label: "Abertos" },
  { id: "in_progress", label: "Em andamento" },
  { id: "resolved", label: "Resolvidos" },
  { id: "closed", label: "Fechados" },
];

interface Props {
  tickets: Ticket[];
  onPick: (ticketId: string) => void;
}

export function TicketsKanban({ tickets, onPick }: Props) {
  const grouped = COLUMNS.map((col) => ({
    col,
    items: tickets.filter((t) => t.status === col.id),
  }));

  return (
    <div className={styles.kanban}>
      {grouped.map(({ col, items }) => (
        <section key={col.id} className={styles.col} aria-label={col.label}>
          <header className={styles.colHead}>
            <h3 className={styles.colTitle}>
              <StatusBadge status={col.id} />
            </h3>
            <span className={styles.colCount}>{items.length}</span>
          </header>
          {items.length === 0 ? (
            <p className={styles.empty}>Nenhum chamado</p>
          ) : (
            <ul className={styles.cardList}>
              {items.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={styles.card}
                    onClick={() => onPick(t.id)}
                    aria-label={`Abrir ${t.protocol}: ${t.title}`}
                  >
                    <div className={styles.proto}>{t.protocol}</div>
                    <p className={styles.title}>{t.title}</p>
                    <div className={styles.meta}>
                      <PriorityChip priority={t.priority} />
                      <span className={styles.time}>{formatRelTime(t.updated_at)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
