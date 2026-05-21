import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { PriorityChip } from "@/ui/PriorityChip/PriorityChip";
import { formatRelTime } from "@/lib/formatRelTime";
import type { Ticket } from "@/types/ticket";
import styles from "./RecentActivityTable.module.css";

export interface RecentRow {
  ticket: Ticket;
  condoId: string;
  condoName: string;
}

interface Props {
  rows: RecentRow[];
  showCondo: boolean;
  onPick: (condoId: string, ticketId: string) => void;
}

function locationLabel(t: Ticket): string {
  if (t.common_area_name) return t.common_area_name;
  if (t.block_name && t.unit_number) return `${t.block_name} · ${t.unit_number}`;
  if (t.unit_number) return t.unit_number;
  return "—";
}

export function RecentActivityTable({ rows, showCondo, onPick }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.wrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Protocolo</th>
              <th>Chamado</th>
              {showCondo ? <th>Condomínio</th> : null}
              <th>Status</th>
              <th>Prioridade</th>
              <th>Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ ticket, condoId, condoName }) => (
              <tr
                key={ticket.id}
                role="button"
                tabIndex={0}
                aria-label={`Abrir ${ticket.title}`}
                className={styles.row}
                onClick={() => onPick(condoId, ticket.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onPick(condoId, ticket.id);
                  }
                }}
              >
                <td className={styles.proto}>{ticket.protocol}</td>
                <td>
                  <div className={styles.title}>{ticket.title}</div>
                  <div className={styles.sub}>
                    {locationLabel(ticket)}
                    {ticket.resident_name ? ` · ${ticket.resident_name}` : ""}
                  </div>
                </td>
                {showCondo ? <td className={styles.condo}>{condoName}</td> : null}
                <td>
                  <StatusBadge status={ticket.status} />
                </td>
                <td>
                  <PriorityChip priority={ticket.priority} />
                </td>
                <td className={styles.time}>{formatRelTime(ticket.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
