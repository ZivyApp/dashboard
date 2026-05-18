import { Check } from "lucide-react";
import type { ActivityEvent } from "./repository/types";
import { iconFor } from "./activityIcon";
import { isUnread, isUrgent } from "./activityPalette";
import { formatRelTime } from "@/lib/formatRelTime";
import styles from "./ActivityItem.module.css";

interface Props {
  event: ActivityEvent;
  onPick: (event: ActivityEvent) => void;
  onMarkRead: (id: string) => void;
}

export function ActivityItem({ event, onPick, onMarkRead }: Props) {
  const Icon = iconFor(event.kind);
  const unread = isUnread(event);
  const urgent = isUrgent(event);
  const cls = [styles.row, unread ? styles.unread : ""].filter(Boolean).join(" ");

  return (
    <div
      role="button"
      tabIndex={0}
      className={cls}
      onClick={() => onPick(event)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick(event);
        }
      }}
      aria-label={event.title}
    >
      <span className={styles.iconBox} data-kind={event.kind} aria-hidden="true">
        <Icon size={18} />
      </span>
      <div className={styles.body}>
        <div className={styles.head}>
          <p className={styles.title}>{event.title}</p>
          {urgent ? <span className={`${styles.badge} ${styles.badgeUrgent}`}>Urgente</span> : null}
          {unread && !urgent ? <span className={styles.badge}>Novo</span> : null}
          <span className={styles.time}>{formatRelTime(event.occurredAt)}</span>
        </div>
        {event.subtitle ? <p className={styles.sub}>{event.subtitle}</p> : null}
      </div>
      {unread ? (
        <button
          type="button"
          aria-label="Marcar como lido"
          className={styles.markBtn}
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(event.id);
          }}
        >
          <Check size={14} />
        </button>
      ) : null}
    </div>
  );
}
