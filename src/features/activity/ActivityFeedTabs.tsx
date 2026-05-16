import type { ActivityTab } from "./repository/types";
import styles from "./ActivityFeedTabs.module.css";

interface Props {
  value: ActivityTab;
  counts: Record<ActivityTab, number>;
  onChange: (next: ActivityTab) => void;
}

const TABS: ReadonlyArray<{ value: ActivityTab; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "unread", label: "Não lidos" },
  { value: "approvals", label: "Aprovações" },
];

export function ActivityFeedTabs({ value, counts, onChange }: Props) {
  return (
    <div className={styles.tabs} role="tablist">
      {TABS.map((t) => {
        const active = value === t.value;
        const cls = [styles.tab, active ? styles.active : ""].filter(Boolean).join(" ");
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cls}
            onClick={() => onChange(t.value)}
          >
            {t.label}
            <span className={styles.badge}>{counts[t.value]}</span>
          </button>
        );
      })}
    </div>
  );
}
