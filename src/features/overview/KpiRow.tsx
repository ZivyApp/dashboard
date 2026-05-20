import type { TicketStats } from "@/features/tickets/ticketStats";
import styles from "./KpiRow.module.css";

interface Props {
  stats: TicketStats;
}

export function KpiRow({ stats }: Props) {
  return (
    <div className={styles.row}>
      <div className={styles.kpi}>
        <div className={styles.label}>Abertos</div>
        <div className={styles.num}>{stats.open}</div>
        <div className={styles.sub}>aguardando triagem ou atribuição</div>
      </div>
      <div className={styles.kpi}>
        <div className={styles.label}>Em andamento</div>
        <div className={`${styles.num} ${styles.brand ?? ""}`}>{stats.inProgress}</div>
        <div className={styles.sub}>com responsável ativo</div>
      </div>
      <div className={styles.kpi}>
        <div className={styles.label}>Resolvidos</div>
        <div className={styles.num}>{stats.resolved}</div>
        <div className={styles.sub}>prontos para fechamento</div>
      </div>
      <div className={styles.kpi}>
        <div className={styles.label}>Urgentes ativos</div>
        <div className={`${styles.num} ${styles.urgent ?? ""}`}>{stats.urgent}</div>
        <div className={styles.sub}>prioridade alta em aberto</div>
      </div>
    </div>
  );
}
