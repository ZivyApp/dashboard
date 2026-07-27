import { Button } from "@/ui/Button/Button";
import { Modal } from "@/ui/Modal/Modal";
import type { Unit } from "./unit";
import styles from "./DeleteBlockDialog.module.css";

interface DeleteUnitDialogProps {
  unit: Unit | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteUnitDialog({
  unit,
  busy = false,
  onCancel,
  onConfirm,
}: DeleteUnitDialogProps) {
  if (!unit) return null;
  return (
    <Modal open onClose={onCancel} title={`Excluir unidade ${unit.number}?`}>
      <p className={styles.copy}>
        Moradores vinculados a esta unidade ficarão sem unidade cadastrada. Essa ação não pode ser
        desfeita.
      </p>
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          {busy ? "Excluindo…" : "Excluir"}
        </Button>
      </div>
    </Modal>
  );
}
