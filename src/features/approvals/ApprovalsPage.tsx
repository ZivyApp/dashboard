import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Spinner } from "@/ui/Spinner/Spinner";
import { useScope } from "@/features/scope/useScope";
import { usePendingResidents } from "./usePendingResidents";
import { useApproveResident } from "./useApproveResident";
import { useRejectResident } from "./useRejectResident";
import { ApprovalCard } from "./ApprovalCard";
import { RejectConfirmDialog } from "./RejectConfirmDialog";
import type { PendingResident } from "./pendingResident";
import styles from "./ApprovalsPage.module.css";

export function ApprovalsPage() {
  const scope = useScope();
  const { residents, isPending, isError } = usePendingResidents(scope);
  const { approve, pendingId: approvingId } = useApproveResident();
  const { reject, pendingId: rejectingId } = useRejectResident();

  const [toReject, setToReject] = useState<PendingResident | null>(null);
  const [approvedCount, setApprovedCount] = useState(0);

  function handleApprove(r: PendingResident) {
    approve({ id: r.id, condoId: r.condoId }, { onSuccess: () => setApprovedCount((n) => n + 1) });
  }

  function handleConfirmReject() {
    if (!toReject) return;
    reject({ id: toReject.id, condoId: toReject.condoId }, { onSuccess: () => setToReject(null) });
  }

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Aprovações pendentes</h1>
          <p className={styles.sub}>
            Moradores que se cadastraram via bot Telegram e estão <strong>pendentes</strong>,
            aguardando confirmação do gestor.
          </p>
        </div>
        {approvedCount > 0 && (
          <span className={styles.approvedBadge}>
            {approvedCount} aprovado{approvedCount > 1 ? "s" : ""} nesta sessão
          </span>
        )}
      </header>

      {isPending ? (
        <Spinner />
      ) : isError ? (
        <div role="alert" className={styles.empty}>
          Não foi possível carregar as aprovações.
        </div>
      ) : residents.length === 0 ? (
        <div className={styles.empty}>
          {approvedCount > 0
            ? "Tudo aprovado! Não há mais moradores aguardando aprovação."
            : "Nenhuma aprovação pendente no momento."}
        </div>
      ) : (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.sectionTitle}>Moradores pendentes</h2>
            <span className={styles.count}>
              {residents.length} aguardando · confirme a identidade antes de aprovar
            </span>
          </div>
          <div className={styles.banner}>
            <ShieldCheck size={14} />
            <span>
              Aprovar muda o status para <strong>ativo</strong> e libera o morador para abrir
              chamados.
            </span>
          </div>
          <div className={styles.list}>
            {residents.map((r) => (
              <ApprovalCard
                key={r.id}
                resident={r}
                onApprove={() => handleApprove(r)}
                onReject={() => setToReject(r)}
                busy={r.id === approvingId || r.id === rejectingId}
              />
            ))}
          </div>
        </section>
      )}

      <RejectConfirmDialog
        resident={toReject}
        onCancel={() => setToReject(null)}
        onConfirm={handleConfirmReject}
        busy={toReject !== null && toReject.id === rejectingId}
      />
    </>
  );
}
