import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/ui/Button/Button";
import { Spinner } from "@/ui/Spinner/Spinner";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import { useInboxTickets } from "./useInboxTickets";
import { filterTickets, type FilterState } from "./filterTickets";
import { InboxFilters } from "./InboxFilters";
import { InboxList } from "./InboxList";
import styles from "./InboxPage.module.css";

interface InboxPageProps {
  condoId: string;
}

const DEFAULT_FILTERS: FilterState = { search: "", status: "all", priority: "all" };

export function InboxPage({ condoId }: InboxPageProps) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const navigate = useNavigate();
  const { data, isPending, isFetching, isError, refetch } = useInboxTickets(condoId);

  const filtered = useMemo(() => filterTickets(data ?? [], filters), [data, filters]);

  const handlePick = (ticketId: string) => {
    void navigate({ to: "/c/$condoId/inbox/$ticketId", params: { condoId, ticketId } });
  };

  if (isPending) {
    return (
      <>
        <PageHeader count={undefined} />
        <Spinner />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader count={undefined} />
        <div className={styles.error}>
          <h2>Não foi possível carregar a inbox</h2>
          <p>Tente novamente em alguns segundos.</p>
          <Button onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      </>
    );
  }

  const hasActiveFilters =
    filters.search !== "" || filters.status !== "all" || filters.priority !== "all";

  return (
    <>
      <PageHeader count={filtered.length} />
      {isFetching && <div className={styles.fetching} />}
      <InboxFilters value={filters} onChange={setFilters} />
      {filtered.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            title="Nenhum chamado"
            description="Ajuste os filtros para ver outros tickets."
          />
        ) : (
          <EmptyState
            title="Tudo em dia"
            description="Nenhum chamado aberto ou em andamento neste condomínio."
          />
        )
      ) : (
        <InboxList tickets={filtered} onPick={handlePick} />
      )}
    </>
  );
}

function PageHeader({ count }: { count: number | undefined }) {
  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>Inbox</h1>
        <p className={styles.subtitle}>
          {count === undefined
            ? "Carregando…"
            : `${count} chamado${count === 1 ? "" : "s"} ativo${count === 1 ? "" : "s"}`}
        </p>
      </div>
    </header>
  );
}
