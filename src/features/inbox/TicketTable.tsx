import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { PriorityChip } from "@/ui/PriorityChip/PriorityChip";
import type { Ticket } from "./filterTickets";
import { formatRelTime } from "./formatRelTime";
import styles from "./TicketTable.module.css";

interface TicketTableProps {
  tickets: Ticket[];
  onPick: (ticketId: string) => void;
}

function locationLabel(t: Ticket): string {
  if (t.common_area_name) return t.common_area_name;
  if (t.block_name && t.unit_number) return `${t.block_name} · ${t.unit_number}`;
  if (t.unit_number) return t.unit_number;
  return "—";
}

export function TicketTable({ tickets, onPick }: TicketTableProps) {
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
            <tr key={t.id} onClick={() => onPick(t.id)}>
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
