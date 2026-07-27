import { useState, type FormEvent } from "react";
import { Button } from "@/ui/Button/Button";
import { Modal } from "@/ui/Modal/Modal";
import type { Block } from "./block";
import { useCreateBlock } from "./useCreateBlock";
import { useUpdateBlock } from "./useUpdateBlock";
import styles from "./BlockFormModal.module.css";

interface BlockFormModalProps {
  condoId: string;
  /** null = criação; presente = edição (campos pré-preenchidos). */
  block: Block | null;
  onClose: () => void;
}

export function BlockFormModal({ condoId, block, onClose }: BlockFormModalProps) {
  const [name, setName] = useState(block?.name ?? "");
  const [description, setDescription] = useState(block?.description ?? "");
  const { createBlock, isPending: creating, formError: createError } = useCreateBlock(condoId);
  const { updateBlock, isPending: updating, formError: updateError } = useUpdateBlock(condoId);

  const isPending = creating || updating;
  const formError = block !== null ? updateError : createError;
  const canSubmit = name.trim() !== "" && !isPending;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    const desc = description.trim();
    if (block !== null) {
      // Edição envia description sempre ("" limpa o campo no PATCH parcial).
      updateBlock({ id: block.id, name: name.trim(), description: desc }, { onSuccess: onClose });
    } else {
      createBlock(
        { name: name.trim(), ...(desc !== "" ? { description: desc } : {}) },
        { onSuccess: onClose },
      );
    }
  }

  return (
    <Modal open onClose={onClose} title={block !== null ? "Editar bloco" : "Novo bloco"}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {formError !== null && (
          <p role="alert" className={styles.banner}>
            {formError}
          </p>
        )}
        <div className={styles.field}>
          <label htmlFor="block-name" className={styles.label}>
            Nome
          </label>
          <input
            id="block-name"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            placeholder="Ex.: Torre A"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="block-description" className={styles.label}>
            Descrição (opcional)
          </label>
          <input
            id="block-description"
            className={styles.input}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={120}
            placeholder="Ex.: Bloco da frente, perto da portaria"
          />
        </div>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {isPending ? "Salvando…" : block !== null ? "Salvar" : "Criar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
