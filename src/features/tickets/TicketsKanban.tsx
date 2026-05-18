import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { PriorityChip } from "@/ui/PriorityChip/PriorityChip";
import { formatRelTime } from "@/lib/formatRelTime";
import { TICKET_STATUSES, type Ticket, type TicketStatus } from "@/types/ticket";
import styles from "./TicketsKanban.module.css";

interface Column {
  id: TicketStatus;
  label: string;
}

const COLUMN_LABELS: Record<TicketStatus, string> = {
  open: "Abertos",
  in_progress: "Em andamento",
  resolved: "Resolvidos",
  closed: "Fechados",
};

// Deriva colunas direto de TICKET_STATUSES — se o Core adicionar um status
// novo no `TicketStatus` union, o `Record<TicketStatus, string>` acima quebra
// em build, forçando atualização desta lista.
const COLUMNS: Column[] = TICKET_STATUSES.map((id) => ({ id, label: COLUMN_LABELS[id] }));

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
