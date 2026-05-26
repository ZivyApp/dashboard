import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Filter, Table } from "lucide-react";
import { Button } from "@/ui/Button/Button";
import { Spinner } from "@/ui/Spinner/Spinner";
import { useMyCondos } from "@/features/condo/useMyCondos";
import { useTickets } from "@/features/tickets/useTickets";
import { ticketStats } from "@/features/tickets/ticketStats";
import { KpiRow } from "./KpiRow";
import { RecentActivityTable, type RecentRow } from "./RecentActivityTable";
import styles from "./overviewLayout.module.css";

interface Props {
  condoId: string;
}

export function CondoOverviewPage({ condoId }: Props) {
  const navigate = useNavigate();
  const { data: condos } = useMyCondos();
  const { data: tickets, isPending, isError } = useTickets(condoId);

  const list = useMemo(() => tickets ?? [], [tickets]);
  const kpis = useMemo(() => ticketStats(list), [list]);
  const condoName = condos?.find((c) => c.condoId === condoId)?.condoName ?? "Visão geral";

  const recent: RecentRow[] = useMemo(
    () =>
      list
        .map((ticket) => ({ ticket, condoId, condoName }))
        .sort((a, b) => b.ticket.updated_at.localeCompare(a.ticket.updated_at))
        .slice(0, 6),
    [list, condoId, condoName],
  );

  function pickTicket(cId: string, ticketId: string) {
    void navigate({ to: "/c/$condoId/tickets/$ticketId", params: { condoId: cId, ticketId } });
  }

  function goToTickets() {
    void navigate({ to: "/c/$condoId/tickets", params: { condoId } });
  }

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{condoName}</h1>
          <p className={styles.sub}>Status operacional do condomínio.</p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" disabled title="Em breve">
            <Filter size={14} /> Período
          </Button>
          <Button onClick={goToTickets}>
            <Table size={14} /> Ver chamados
          </Button>
        </div>
      </header>

      {isError ? (
        <p role="alert" className={styles.sub}>
          Não foi possível carregar os chamados deste condomínio.
        </p>
      ) : null}

      <KpiRow stats={kpis} />

      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Atividade recente</h2>
      </div>
      {isPending ? (
        <Spinner />
      ) : (
        <RecentActivityTable rows={recent} showCondo={false} onPick={pickTicket} />
      )}
    </>
  );
}
