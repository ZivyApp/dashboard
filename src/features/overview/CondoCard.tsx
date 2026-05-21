import type { CondoMembership } from "@/features/condo/useMyCondos";
import type { TicketStats } from "@/features/tickets/ticketStats";
import { condoMark } from "./condoMark";
import styles from "./CondoCard.module.css";

interface Props {
  condo: CondoMembership;
  stats: TicketStats;
  onFocus: (condoId: string) => void;
}

export function CondoCard({ condo, stats, onFocus }: Props) {
  const total = stats.open + stats.inProgress + stats.resolved;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <button type="button" className={styles.card} onClick={() => onFocus(condo.condoId)}>
      <div className={styles.head}>
        <div className={styles.mark}>{condoMark(condo.condoName)}</div>
        <h3 className={styles.name}>{condo.condoName}</h3>
      </div>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{stats.open}</span>
          <span className={styles.statLab}>Abertos</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{stats.inProgress}</span>
          <span className={styles.statLab}>Em curso</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{stats.resolved}</span>
          <span className={styles.statLab}>Resolvidos</span>
        </div>
        <div className={`${styles.stat} ${stats.urgent > 0 ? (styles.statUrgent ?? "") : ""}`}>
          <span className={styles.statNum}>{stats.urgent}</span>
          <span className={styles.statLab}>Urgentes</span>
        </div>
      </div>
      <div className={styles.progress}>
        <i className={styles.pOpen} style={{ width: `${pct(stats.open)}%` }} />
        <i className={styles.pProg} style={{ width: `${pct(stats.inProgress)}%` }} />
        <i className={styles.pRes} style={{ width: `${pct(stats.resolved)}%` }} />
      </div>
    </button>
  );
}
