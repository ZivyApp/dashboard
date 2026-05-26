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
import styles from "./TicketTimeline.module.css";

interface TicketTimelineProps {
  events: TicketEvent[];
  ticketCreatedAt: string | undefined;
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

function actorLabel(item: TimelineItem): string {
  if (item.kind === "created") return "Sistema";
  return ACTOR_LABEL[item.event.actorType] ?? "Sistema";
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

export function TicketTimeline({ events, ticketCreatedAt }: TicketTimelineProps) {
  const items = buildTimeline(events, ticketCreatedAt);
  if (items.length === 0) {
    return <div className={styles.empty}>Sem eventos ainda.</div>;
  }
  return (
    <div className={styles.timeline}>
      {items.map((item) => {
        const body = item.kind === "comment_added" ? commentText(item.event) : null;
        return (
          <div key={item.id} className={styles.item}>
            <span
              className={[styles.dot, DOT_CLASS[item.kind]].filter(Boolean).join(" ")}
              aria-hidden="true"
            />
            <div className={styles.head}>
              <span className={styles.author}>{actorLabel(item)}</span>
              <span className={styles.action}>
                <ActionText item={item} />
              </span>
              <span className={styles.time}>{formatRelTime(item.at)}</span>
            </div>
            {body && <div className={styles.body}>{body}</div>}
          </div>
        );
      })}
    </div>
  );
}
