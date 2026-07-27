import { useState, type FormEvent } from "react";
import { Button } from "@/ui/Button/Button";
import { Modal } from "@/ui/Modal/Modal";
import type { Block } from "./block";
import type { Unit } from "./unit";
import { useCreateUnit } from "./useCreateUnit";
import { useUpdateUnit } from "./useUpdateUnit";
import styles from "./UnitFormModal.module.css";

interface UnitFormModalProps {
  condoId: string;
  /** null = criação; presente = edição. */
  unit: Unit | null;
  /** Blocos do condo (select no create; lookup de nome no edit). */
  blocks: Block[];
  onClose: () => void;
}

function parseFloor(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const n = Number.parseInt(trimmed, 10);
  return Number.isNaN(n) ? undefined : n;
}

export function UnitFormModal({ condoId, unit, blocks, onClose }: UnitFormModalProps) {
  const [blockId, setBlockId] = useState(unit?.blockId ?? "");
  const [number, setNumber] = useState(unit?.number ?? "");
  const [floor, setFloor] = useState(unit?.floor !== undefined ? String(unit.floor) : "");
  const { createUnit, isPending: creating, formError: createError } = useCreateUnit(condoId);
  const { updateUnit, isPending: updating, formError: updateError } = useUpdateUnit(condoId);

  const isPending = creating || updating;
  const formError = unit !== null ? updateError : createError;
  const floorValid = floor.trim() === "" || parseFloor(floor) !== undefined;
  const canSubmit =
    number.trim() !== "" && (unit !== null || blockId !== "") && floorValid && !isPending;

  const blockName = unit !== null ? (blocks.find((b) => b.id === unit.blockId)?.name ?? "—") : null;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    const floorNum = parseFloor(floor);
    if (unit !== null) {
      updateUnit(
        {
          id: unit.id,
          number: number.trim(),
          ...(floorNum !== undefined ? { floor: floorNum } : {}),
        },
        { onSuccess: onClose },
      );
    } else {
      createUnit(
        {
          blockId,
          number: number.trim(),
          ...(floorNum !== undefined ? { floor: floorNum } : {}),
        },
        { onSuccess: onClose },
      );
    }
  }

  return (
    <Modal open onClose={onClose} title={unit !== null ? "Editar unidade" : "Nova unidade"}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {formError !== null && (
          <p role="alert" className={styles.banner}>
            {formError}
          </p>
        )}
        {unit !== null ? (
          <div className={styles.field}>
            <span className={styles.label}>Bloco</span>
            <span className={styles.staticValue}>{blockName}</span>
          </div>
        ) : (
          <div className={styles.field}>
            <label htmlFor="unit-block" className={styles.label}>
              Bloco
            </label>
            <select
              id="unit-block"
              className={styles.input}
              value={blockId}
              onChange={(e) => setBlockId(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={styles.field}>
          <label htmlFor="unit-number" className={styles.label}>
            Número
          </label>
          <input
            id="unit-number"
            className={styles.input}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            required
            maxLength={20}
            placeholder="Ex.: 101, 203, Sala 4"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="unit-floor" className={styles.label}>
            Andar (opcional)
          </label>
          <input
            id="unit-floor"
            className={styles.input}
            type="number"
            step={1}
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder="Ex.: 0 (térreo), 2"
          />
        </div>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {isPending ? "Salvando…" : unit !== null ? "Salvar" : "Criar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
