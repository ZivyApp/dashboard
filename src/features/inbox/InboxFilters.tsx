import type { FilterState } from "./filterTickets";
import type { TicketPriority } from "./types";
import styles from "./InboxFilters.module.css";

interface InboxFiltersProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
}

const STATUS_OPTIONS: ReadonlyArray<{ value: FilterState["status"]; label: string }> = [
  { value: "all", label: "Tudo" },
  { value: "open", label: "Abertos" },
  { value: "in_progress", label: "Em andamento" },
];

const PRIORITY_OPTIONS: ReadonlyArray<{ value: FilterState["priority"]; label: string }> = [
  { value: "all", label: "Qualquer prioridade" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
];

export function InboxFilters({ value, onChange }: InboxFiltersProps) {
  return (
    <div className={styles.bar}>
      <input
        type="search"
        className={styles.search}
        placeholder="Buscar por título, protocolo ou morador…"
        aria-label="Buscar chamados"
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
      />
      <div className={styles.seg} role="group" aria-label="Filtro por status">
        {STATUS_OPTIONS.map((o) => {
          const active = value.status === o.value;
          const cls = [styles.segBtn, active ? styles.active : ""].filter(Boolean).join(" ");
          return (
            <button
              key={o.value}
              type="button"
              className={cls}
              aria-pressed={active}
              onClick={() => onChange({ ...value, status: o.value })}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <select
        className={styles.select}
        aria-label="Filtrar por prioridade"
        value={value.priority}
        onChange={(e) => onChange({ ...value, priority: e.target.value as TicketPriority | "all" })}
      >
        {PRIORITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
