import { Search } from "lucide-react";
import { useTicketsView, type ViewMode } from "./viewModeStore";
import type { TicketStatus, TicketPriority } from "@/types/ticket";
import styles from "./TicketsFilters.module.css";

export type StatusValue = TicketStatus | "all";
export type PriorityValue = TicketPriority | "all";

interface FilterValue {
  search: string;
  status: StatusValue;
  priority: PriorityValue;
}

interface Counts {
  all: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

interface Props {
  value: FilterValue;
  counts: Counts;
  onChange: (v: FilterValue) => void;
}

const STATUS_OPTIONS: { value: StatusValue; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "open", label: "Abertos" },
  { value: "in_progress", label: "Em andamento" },
  { value: "resolved", label: "Resolvidos" },
  { value: "closed", label: "Fechados" },
];

const PRIORITY_OPTIONS: { value: PriorityValue; label: string }[] = [
  { value: "all", label: "Qualquer prioridade" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
];

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "table", label: "Tabela" },
  { value: "cards", label: "Cards" },
  { value: "kanban", label: "Kanban" },
];

function countFor(counts: Counts, status: StatusValue): number {
  if (status === "all") return counts.all;
  return counts[status] ?? 0;
}

export function TicketsFilters({ value, counts, onChange }: Props) {
  const mode = useTicketsView((s) => s.mode);
  const setMode = useTicketsView((s) => s.setMode);

  return (
    <div className={styles.filterBar}>
      <label className={styles.search}>
        <Search aria-hidden="true" size={14} />
        <input
          type="text"
          placeholder="Buscar por título, protocolo, morador…"
          value={value.search}
          onChange={(e) => {
            onChange({ ...value, search: e.target.value });
          }}
          aria-label="Buscar chamados"
        />
      </label>

      <div className={styles.seg} role="group" aria-label="Filtrar por status">
        {STATUS_OPTIONS.map((opt) => {
          const active = value.status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              className={active ? styles.segActive : ""}
              onClick={() => {
                onChange({ ...value, status: opt.value });
              }}
            >
              {opt.label} ({countFor(counts, opt.value)})
            </button>
          );
        })}
      </div>

      <select
        className={styles.priorityInput}
        value={value.priority}
        onChange={(e) => {
          onChange({ ...value, priority: e.target.value as PriorityValue });
        }}
        aria-label="Filtrar por prioridade"
      >
        {PRIORITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <div
        className={`${styles.seg} ${styles.viewToggle}`}
        role="group"
        aria-label="Modo de visualização"
      >
        {VIEW_OPTIONS.map((opt) => {
          const active = mode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              className={active ? styles.segActive : ""}
              onClick={() => {
                setMode(opt.value);
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
