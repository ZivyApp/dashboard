import { Check, X } from "lucide-react";
import { Avatar } from "@/ui/Avatar/Avatar";
import { Button } from "@/ui/Button/Button";
import { formatRelTime } from "@/lib/formatRelTime";
import { formatPhone } from "@/lib/formatPhone";
import type { PendingResident } from "./pendingResident";
import styles from "./ApprovalCard.module.css";

interface ApprovalCardProps {
  resident: PendingResident;
  onApprove: () => void;
  onReject: () => void;
  busy?: boolean;
}

export function ApprovalCard({ resident, onApprove, onReject, busy = false }: ApprovalCardProps) {
  return (
    <div className={styles.card}>
      <Avatar name={resident.name} size="lg" />
      <div className={styles.info}>
        <div className={styles.name}>{resident.name}</div>
        <div className={styles.meta}>
          <span>{resident.condoName}</span>
          <span className={styles.phone}>{formatPhone(resident.phone)}</span>
          <span className={styles.pending}>Pendente {formatRelTime(resident.createdAt)}</span>
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={onReject} disabled={busy}>
          <X size={14} /> Rejeitar
        </Button>
        <Button variant="primary" size="sm" onClick={onApprove} disabled={busy}>
          <Check size={14} /> Aprovar
        </Button>
      </div>
    </div>
  );
}
