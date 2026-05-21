import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Filter, Table } from "lucide-react";
import { Button } from "@/ui/Button/Button";
import { Spinner } from "@/ui/Spinner/Spinner";
import { setLastSelected } from "@/stores/activeCondo";
import { useMyCondos } from "@/features/condo/useMyCondos";
import { useTicketsScoped } from "@/features/tickets/useTicketsScoped";
import { ticketStats } from "@/features/tickets/ticketStats";
import { KpiRow } from "./KpiRow";
import { CondoCard } from "./CondoCard";
import { RecentActivityTable, type RecentRow } from "./RecentActivityTable";
import styles from "./OverviewPage.module.css";

export function OverviewPage() {
  const navigate = useNavigate();
  const { data: condos } = useMyCondos();
  const { byCondo, isPending, isError } = useTicketsScoped();

  const allTickets = useMemo(() => byCondo.flatMap((c) => c.tickets), [byCondo]);
  const kpis = useMemo(() => ticketStats(allTickets), [allTickets]);

  const recent: RecentRow[] = useMemo(() => {
    const rows = byCondo.flatMap((c) =>
      c.tickets.map((ticket) => ({
        ticket,
        condoId: c.condo.condoId,
        condoName: c.condo.condoName,
      })),
    );
    return rows.sort((a, b) => b.ticket.updated_at.localeCompare(a.ticket.updated_at)).slice(0, 6);
  }, [byCondo]);

  const multi = byCondo.length > 1;
  const title = multi ? "Visão geral" : (byCondo[0]?.condo.condoName ?? "Visão geral");
  const subtitle = multi
    ? `Operação consolidada de ${byCondo.length} condomínios.`
    : "Status operacional do condomínio.";

  function focusCondo(condoId: string) {
    setLastSelected(condoId);
    void navigate({ to: "/c/$condoId", params: { condoId } });
  }

  function pickTicket(condoId: string, ticketId: string) {
    setLastSelected(condoId);
    void navigate({ to: "/c/$condoId/inbox/$ticketId", params: { condoId, ticketId } });
  }

  function goToTickets() {
    const target = byCondo[0]?.condo.condoId ?? condos?.[0]?.condoId;
    if (!target) return;
    setLastSelected(target);
    void navigate({ to: "/c/$condoId/tickets", params: { condoId: target } });
  }

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.sub}>{subtitle}</p>
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
          Não foi possível carregar todos os condomínios. Mostrando o que veio.
        </p>
      ) : null}

      <KpiRow stats={kpis} />

      {multi ? (
        <>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Condomínios</h2>
            <span className={styles.sectionHint}>Clique para focar o contexto</span>
          </div>
          <div className={styles.grid}>
            {byCondo.map((c) => (
              <CondoCard
                key={c.condo.condoId}
                condo={c.condo}
                stats={ticketStats(c.tickets)}
                onFocus={focusCondo}
              />
            ))}
          </div>
        </>
      ) : null}

      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Atividade recente</h2>
      </div>
      {isPending ? (
        <Spinner />
      ) : (
        <RecentActivityTable rows={recent} showCondo={multi} onPick={pickTicket} />
      )}
    </>
  );
}
