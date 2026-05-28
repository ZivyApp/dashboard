import { TICKET_STATUSES, type TicketStatus } from "@/types/ticket";
import styles from "./TicketStatusControl.module.css";

interface TicketStatusControlProps {
  status: TicketStatus;
  onChange: (status: TicketStatus) => void;
  disabled: boolean;
}

const LABELS: Record<TicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
};

export function TicketStatusControl({ status, onChange, disabled }: TicketStatusControlProps) {
  return (
    <div className={styles.control}>
      <div className={styles.label}>Mudar status</div>
      <div className={styles.seg} role="group" aria-label="Mudar status do chamado">
        {TICKET_STATUSES.map((s) => {
          const active = s === status;
          return (
            <button
              key={s}
              type="button"
              className={[styles.segButton, active ? (styles.active ?? "") : ""]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={active}
              disabled={disabled}
              onClick={() => {
                if (!active) onChange(s);
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
