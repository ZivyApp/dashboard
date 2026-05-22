import { Button } from "@/ui/Button/Button";
import { Modal } from "@/ui/Modal/Modal";
import type { PendingResident } from "./pendingResident";
import styles from "./RejectConfirmDialog.module.css";

interface RejectConfirmDialogProps {
  resident: PendingResident | null;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}

export function RejectConfirmDialog({
  resident,
  onCancel,
  onConfirm,
  busy = false,
}: RejectConfirmDialogProps) {
  if (!resident) return null;
  return (
    <Modal open onClose={onCancel} title={`Rejeitar ${resident.name}?`}>
      <p>
        O morador será removido do sistema (status <strong>INACTIVE</strong>). Ele não poderá abrir
        chamados e precisará refazer o onboarding caso queira se cadastrar novamente.
      </p>
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          Rejeitar
        </Button>
      </div>
    </Modal>
  );
}
