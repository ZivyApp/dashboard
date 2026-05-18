import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Download, Plus } from "lucide-react";
import { Button } from "@/ui/Button/Button";
import { Spinner } from "@/ui/Spinner/Spinner";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import { useMyCondos } from "@/features/condo/useMyCondos";
import { isAtLeast } from "@/features/condo/roleHierarchy";
import { useTickets } from "./useTickets";
import { useTicketsView } from "./viewModeStore";
import { filterTickets } from "./filterTickets";
import { useExportTickets } from "./useExportTickets";
import { TicketsFilters, type StatusValue, type PriorityValue } from "./TicketsFilters";
import { TicketsTable } from "./TicketsTable";
import { TicketsCards } from "./TicketsCards";
import { TicketsKanban } from "./TicketsKanban";
import styles from "./TicketsPage.module.css";

interface Props {
  condoId: string;
}

interface FilterState {
  search: string;
  status: StatusValue;
  priority: PriorityValue;
}

const INITIAL_FILTERS: FilterState = { search: "", status: "all", priority: "all" };

export function TicketsPage({ condoId }: Props) {
  const navigate = useNavigate();
  const { data, isPending, isError, refetch } = useTickets(condoId);
  const mode = useTicketsView((s) => s.mode);
  const { exportTickets, isLoading: isExporting, error: exportError } = useExportTickets(condoId);
  const myCondos = useMyCondos();
  const role = myCondos.data?.find((c) => c.condoId === condoId)?.role;
  const canExport = role !== undefined && isAtLeast(role, "manager");
  const canCreate = role !== undefined && isAtLeast(role, "staff");
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const sorted = useMemo(() => filterTickets(data ?? [], filters), [data, filters]);

  const counts = useMemo(() => {
    const base = data ?? [];
    return {
      all: base.length,
      open: base.filter((t) => t.status === "open").length,
      in_progress: base.filter((t) => t.status === "in_progress").length,
      resolved: base.filter((t) => t.status === "resolved").length,
      closed: base.filter((t) => t.status === "closed").length,
    };
  }, [data]);

  function handlePick(ticketId: string) {
    void navigate({
      to: "/c/$condoId/tickets/$ticketId",
      params: { condoId, ticketId },
    });
  }

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Tickets</h1>
          <p className={styles.sub}>
            {sorted.length} chamado{sorted.length === 1 ? "" : "s"} · ordenados por prioridade
          </p>
        </div>
        <div className={styles.actions}>
          {canExport ? (
            <Button
              variant="secondary"
              onClick={() => {
                void exportTickets();
              }}
              disabled={isExporting}
            >
              <Download size={14} /> {isExporting ? "Exportando…" : "Exportar CSV"}
            </Button>
          ) : null}
          {canCreate ? (
            <Button
              onClick={() => {
                void navigate({ to: "/c/$condoId/tickets/new", params: { condoId } });
              }}
            >
              <Plus size={14} /> Novo chamado
            </Button>
          ) : null}
        </div>
      </header>

      {exportError ? (
        <p role="alert" className={styles.error}>
          {exportError}
        </p>
      ) : null}

      {isPending ? <Spinner /> : null}

      {isError ? (
        <div className={styles.error}>
          <p>Não foi possível carregar os chamados.</p>
          <Button
            onClick={() => {
              void refetch();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}

      {data ? (
        <>
          <TicketsFilters value={filters} counts={counts} onChange={setFilters} />
          {sorted.length === 0 ? (
            <EmptyState
              title="Nada por aqui"
              description="Ajuste os filtros ou aguarde novos chamados."
            />
          ) : mode === "table" ? (
            <TicketsTable tickets={sorted} onPick={handlePick} />
          ) : mode === "cards" ? (
            <TicketsCards tickets={sorted} onPick={handlePick} />
          ) : (
            <TicketsKanban tickets={sorted} onPick={handlePick} />
          )}
        </>
      ) : null}
    </>
  );
}
