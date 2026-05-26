import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import styles from "./Modal.module.css";

type ModalSize = "md" | "lg";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Largura do dialog em telas grandes. `md` (640px, padrão) ou `lg` (mais largo). */
  size?: ModalSize;
}

const sizeClass: Record<ModalSize, string> = {
  md: "",
  lg: styles.lg ?? "",
};

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const dialogClass = [styles.dialog, sizeClass[size]].filter(Boolean).join(" ");
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={dialogClass} aria-describedby={undefined}>
          <div className={styles.header}>
            <Dialog.Title className={styles.title}>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className={styles.close} aria-label="Fechar">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          <div className={styles.body}>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
