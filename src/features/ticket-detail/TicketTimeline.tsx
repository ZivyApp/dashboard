import { Circle, MessageSquare, RefreshCw, Ticket, UserCheck, type LucideIcon } from "lucide-react";
import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { formatRelTime } from "@/lib/formatRelTime";
import {
  buildTimeline,
  commentText,
  statusChange,
  type TicketActorType,
  type TicketEvent,
  type TimelineItem,
} from "@/types/ticketEvent";
import type { CondoManager } from "./useCondoManagers";
import styles from "./TicketTimeline.module.css";

interface TicketTimelineProps {
  events: TicketEvent[];
  ticketCreatedAt: string | undefined;
  /** Managers do condo, para resolver `actor_id` → nome real na autoria. */
  managers?: CondoManager[];
}

const ACTOR_LABEL: Record<TicketActorType, string> = {
  manager: "Gestor",
  resident: "Morador",
  system: "Sistema",
};

// classe da dot por kind (created/assigned = info; status = brand; comment = neutra)
const DOT_CLASS: Record<TimelineItem["kind"], string> = {
  created: styles.dotSystem ?? "",
  assigned: styles.dotAssign ?? "",
  status_changed: styles.dotStatus ?? "",
  comment_added: styles.dotComment ?? "",
};

// ícone dentro da dot por kind
const DOT_ICON: Record<TimelineItem["kind"], LucideIcon> = {
  created: Ticket,
  assigned: UserCheck,
  status_changed: RefreshCw,
  comment_added: MessageSquare,
};

// Autor do evento: nome real (name || email) quando o `actor_id` bate com um
// manager conhecido; senão o rótulo genérico por actor_type (Gestor/Morador/Sistema).
function authorLabel(item: TimelineItem, managers: CondoManager[]): string {
  if (item.kind === "created") return "Sistema";
  const { actorType, actorId } = item.event;
  if (actorId) {
    const m = managers.find((x) => x.userId === actorId);
    const named = m ? m.name || m.email : "";
    if (named) return named;
  }
  return ACTOR_LABEL[actorType] ?? "Sistema";
}

function ActionText({ item }: { item: TimelineItem }) {
  if (item.kind === "created") return <span>abriu o chamado</span>;
  if (item.kind === "assigned") return <span>assumiu o chamado</span>;
  if (item.kind === "comment_added") return <span>comentou</span>;
  const change = statusChange(item.event);
  if (!change) return <span>mudou o status</span>;
  return (
    <span className={styles.statusAction}>
      {change.from ? (
        <>
          mudou de <StatusBadge status={change.from} /> para <StatusBadge status={change.to} />
        </>
      ) : (
        <>
          mudou para <StatusBadge status={change.to} />
        </>
      )}
    </span>
  );
}

export function TicketTimeline({ events, ticketCreatedAt, managers = [] }: TicketTimelineProps) {
  const items = buildTimeline(events, ticketCreatedAt);
  if (items.length === 0) {
    return <div className={styles.empty}>Sem eventos ainda.</div>;
  }
  return (
    <ol className={styles.timeline}>
      {items.map((item) => {
        const body = item.kind === "comment_added" ? commentText(item.event) : null;
        const DotIcon = DOT_ICON[item.kind] ?? Circle;
        return (
          <li key={item.id} className={styles.item}>
            <span
              className={[styles.dot, DOT_CLASS[item.kind]].filter(Boolean).join(" ")}
              aria-hidden="true"
            >
              <DotIcon size={11} strokeWidth={2.5} />
            </span>
            <div className={styles.head}>
              <span className={styles.author}>{authorLabel(item, managers)}</span>
              <span className={styles.action}>
                <ActionText item={item} />
              </span>
              <span className={styles.time}>{formatRelTime(item.at)}</span>
            </div>
            {body && <div className={styles.body}>{body}</div>}
          </li>
        );
      })}
    </ol>
  );
}
