import { TICKET_STATUSES, type TicketStatus } from "@/types/ticket";
import styles from "./TicketStatusControl.module.css";

interface TicketStatusControlProps {
  status: TicketStatus;
  onChange: (status: TicketStatus) => void;
  disabled?: boolean;
  pendingStatus?: TicketStatus | undefined;
}

const LABELS: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
};

export function TicketStatusControl({
  status,
  onChange,
  disabled,
  pendingStatus,
}: TicketStatusControlProps) {
  return (
    <div className={styles.control}>
      <div className={styles.label}>Mudar status</div>
      <div className={styles.seg} role="group" aria-label="Mudar status do chamado">
        {TICKET_STATUSES.map((s) => {
          const isActive = s === status;
          const isPending = pendingStatus !== undefined && s === pendingStatus;
          const classes = [
            styles.segButton ?? "",
            isActive ? (styles.active ?? "") : "",
            isPending ? (styles.pending ?? "") : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={s}
              type="button"
              className={classes}
              aria-pressed={isActive}
              disabled={disabled}
              onClick={() => {
                if (!isActive) onChange(s);
              }}
            >
              {LABELS[s] ?? s}
            </button>
          );
        })}
      </div>
    </div>
  );
}
