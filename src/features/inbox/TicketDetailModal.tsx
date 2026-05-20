import { Modal } from "@/ui/Modal/Modal";
import { Button } from "@/ui/Button/Button";
import { Spinner } from "@/ui/Spinner/Spinner";
import { StatusBadge } from "@/ui/StatusBadge/StatusBadge";
import { PriorityChip } from "@/ui/PriorityChip/PriorityChip";
import { useTicket } from "./useTicket";
import { formatRelTime } from "@/lib/formatRelTime";
import type { Ticket } from "@/types/ticket";
import styles from "./TicketDetailModal.module.css";

interface TicketDetailModalProps {
  ticketId: string;
  onClose: () => void;
}

function locationLabel(t: Ticket): string {
  if (t.common_area_name) return t.common_area_name;
  if (t.block_name && t.unit_number) return `${t.block_name} · ${t.unit_number}`;
  if (t.unit_number) return t.unit_number;
  return "—";
}

function formatAbsolute(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TicketDetailModal({ ticketId, onClose }: TicketDetailModalProps) {
  const { data, isPending, isFetching, isError, refetch } = useTicket(ticketId);

  if (isPending) {
    return (
      <Modal open={true} onClose={onClose} title="Carregando…">
        <div className={styles.loading}>
          <Spinner />
        </div>
      </Modal>
    );
  }

  if (isError || !data) {
    return (
      <Modal open={true} onClose={onClose} title="Ticket não encontrado">
        <div className={styles.empty}>
          <h3>Não conseguimos abrir esse ticket</h3>
          <p>Pode ter sido removido ou você não tem acesso a ele.</p>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={onClose}>
              Voltar para inbox
            </Button>
            <Button
              onClick={() => {
                void refetch();
              }}
              disabled={isFetching}
            >
              {isFetching ? "Tentando…" : "Tentar novamente"}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={true} onClose={onClose} title={data.title}>
      <div className={styles.proto}>{data.protocol}</div>
      <div className={styles.badges}>
        <StatusBadge status={data.status} />
        <PriorityChip priority={data.priority} />
      </div>
      <div className={styles.meta}>
        {data.resident_name && (
          <span>
            <span className={styles.metaLabel}>Morador:</span>
            <span className={styles.metaValue}>{data.resident_name}</span>
          </span>
        )}
        <span>
          <span className={styles.metaLabel}>Local:</span>
          <span className={styles.metaValue}>{locationLabel(data)}</span>
        </span>
        <span>
          <span className={styles.metaLabel}>Aberto em:</span>
          <span className={styles.metaValue}>{formatAbsolute(data.created_at)}</span>
        </span>
        <span>
          <span className={styles.metaLabel}>Atualizado:</span>
          <span className={styles.metaValue}>{formatRelTime(data.updated_at)}</span>
        </span>
      </div>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Descrição</div>
        <div className={styles.description}>{data.description ?? "Sem descrição."}</div>
      </div>
      <div className={styles.section}>
        <div className={styles.empty}>
          <p>Comentários, atribuição e mudança de status chegam no Plan 5.</p>
        </div>
      </div>
    </Modal>
  );
}
