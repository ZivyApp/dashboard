import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { PriorityChip } from "@/ui/PriorityChip/PriorityChip";
import type { Ticket } from "@/types/ticket";
import { formatRelTime } from "@/lib/formatRelTime";
import styles from "./TicketsTable.module.css";

interface TicketsTableProps {
  tickets: Ticket[];
  onPick: (ticketId: string) => void;
}

function locationLabel(t: Ticket): string {
  if (t.common_area_name) return t.common_area_name;
  if (t.block_name && t.unit_number) return `${t.block_name} · ${t.unit_number}`;
  if (t.unit_number) return t.unit_number;
  return "—";
}

export function TicketsTable({ tickets, onPick }: TicketsTableProps) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Protocolo</th>
            <th>Chamado</th>
            <th>Status</th>
            <th>Prioridade</th>
            <th>Atualizado</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr
              key={t.id}
              role="button"
              tabIndex={0}
              aria-label={`Abrir ${t.title}`}
              onClick={() => onPick(t.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPick(t.id);
                }
              }}
            >
              <td className={styles.proto}>{t.protocol}</td>
              <td>
                <div className={styles.title}>{t.title}</div>
                <div className={styles.sub}>
                  {locationLabel(t)}
                  {t.resident_name ? ` · ${t.resident_name}` : ""}
                </div>
              </td>
              <td>
                <StatusBadge status={t.status} />
              </td>
              <td>
                <PriorityChip priority={t.priority} />
              </td>
              <td className={styles.time}>{formatRelTime(t.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
