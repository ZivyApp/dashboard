import { Button } from "@/ui/Button/Button";
import { Modal } from "@/ui/Modal/Modal";
import type { Block } from "./block";
import styles from "./DeleteBlockDialog.module.css";

interface DeleteBlockDialogProps {
  block: Block | null;
  /** Contagem real de unidades do bloco, quando a página já tem os dados. */
  unitCount?: number;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteBlockDialog({
  block,
  unitCount,
  busy = false,
  onCancel,
  onConfirm,
}: DeleteBlockDialogProps) {
  if (!block) return null;
  return (
    <Modal open onClose={onCancel} title={`Excluir ${block.name}?`}>
      <p className={styles.copy}>
        {unitCount !== undefined && unitCount > 0 ? (
          <>
            Isso removerá o bloco e suas{" "}
            <strong>
              {unitCount} unidade{unitCount > 1 ? "s" : ""}
            </strong>
            .{" "}
          </>
        ) : (
          "Isso removerá o bloco e todas as unidades vinculadas a ele. "
        )}
        Moradores não são removidos. Essa ação não pode ser desfeita.
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
