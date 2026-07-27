import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/ui/Button/Button";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import { Spinner } from "@/ui/Spinner/Spinner";
import { formatFloor, type Unit } from "./unit";
import { useBlocks } from "./useBlocks";
import { useUnits } from "./useUnits";
import { useDeleteUnit } from "./useDeleteUnit";
import { UnitFormModal } from "./UnitFormModal";
import { DeleteUnitDialog } from "./DeleteUnitDialog";
import styles from "./UnitsPage.module.css";

interface UnitsPageProps {
  condoId: string;
}

type FormState = { mode: "create" } | { mode: "edit"; unit: Unit } | null;

export function UnitsPage({ condoId }: UnitsPageProps) {
  const navigate = useNavigate();
  const [blockFilter, setBlockFilter] = useState<string>("all");
  const {
    blocks,
    isPending: blocksPending,
    isError: blocksError,
    refetch: refetchBlocks,
  } = useBlocks(condoId);
  const {
    units,
    isPending: unitsPending,
    isError: unitsError,
    refetch: refetchUnits,
  } = useUnits(condoId, blockFilter === "all" ? undefined : blockFilter);
  const { deleteUnit, isPending: deleting } = useDeleteUnit(condoId);

  const [formState, setFormState] = useState<FormState>(null);
  const [toDelete, setToDelete] = useState<Unit | null>(null);

  const blockNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of blocks ?? []) map.set(b.id, b.name);
    return map;
  }, [blocks]);

  const sorted = useMemo(() => {
    return [...(units ?? [])].sort((a, b) => {
      const blockCmp = (blockNameById.get(a.blockId) ?? "").localeCompare(
        blockNameById.get(b.blockId) ?? "",
        "pt-BR",
      );
      if (blockCmp !== 0) return blockCmp;
      const floorCmp = (a.floor ?? 0) - (b.floor ?? 0);
      if (floorCmp !== 0) return floorCmp;
      return a.number.localeCompare(b.number, "pt-BR", { numeric: true });
    });
  }, [units, blockNameById]);

  function handleConfirmDelete() {
    if (!toDelete) return;
    deleteUnit({ id: toDelete.id }, { onSuccess: () => setToDelete(null) });
  }

  function goToBlocks() {
    void navigate({
      to: "/c/$condoId/structure/blocks",
      params: { condoId },
    });
  }

  const isPending = blocksPending || unitsPending;
  const isError = blocksError || unitsError;
  const hasBlocks = (blocks ?? []).length > 0;

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Unidades</h1>
          <p className={styles.sub}>
            {units !== undefined
              ? `${units.length} unidade${units.length === 1 ? "" : "s"}`
              : "Apartamentos, salas e demais unidades do condomínio"}
          </p>
        </div>
        <div className={styles.actions}>
          {hasBlocks && (
            <Button onClick={() => setFormState({ mode: "create" })}>
              <Plus size={14} /> Nova unidade
            </Button>
          )}
        </div>
      </header>

      {isPending ? (
        <Spinner />
      ) : isError ? (
        <EmptyState
          title="Não foi possível carregar as unidades"
          description="Verifique sua conexão e tente novamente."
          role="alert"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                // O erro pode vir de qualquer uma das queries — refaz as duas,
                // senão uma query falha mantém a página presa no erro.
                void refetchBlocks();
                void refetchUnits();
              }}
            >
              Tentar novamente
            </Button>
          }
        />
      ) : !hasBlocks ? (
        <EmptyState
          title="Cadastre um bloco antes de adicionar unidades"
          description="Unidades pertencem a blocos — comece cadastrando a estrutura de blocos do condomínio."
          action={
            <Button variant="secondary" onClick={goToBlocks}>
              Ir para blocos
            </Button>
          }
        />
      ) : (
        <>
          <div className={styles.filterRow}>
            <label htmlFor="units-block-filter" className={styles.filterLabel}>
              Filtrar por bloco
            </label>
            <select
              id="units-block-filter"
              className={styles.filterSelect}
              value={blockFilter}
              onChange={(e) => setBlockFilter(e.target.value)}
            >
              <option value="all">Todos os blocos</option>
              {(blocks ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {sorted.length === 0 ? (
            <EmptyState
              title={
                blockFilter === "all" ? "Nenhuma unidade cadastrada" : "Nenhuma unidade neste bloco"
              }
              description="Cadastre a primeira unidade para vincular moradores a ela."
              action={
                <Button onClick={() => setFormState({ mode: "create" })}>
                  <Plus size={14} /> Nova unidade
                </Button>
              }
            />
          ) : (
            <ul className={styles.list}>
              {sorted.map((u) => (
                <li key={u.id} className={styles.row}>
                  <div className={styles.rowInfo}>
                    {/* number é texto livre ("101", "Sala 4") — exibido cru,
                        sem prefixo (padrão TicketsTable). */}
                    <span className={styles.rowTitle}>{u.number}</span>
                    <span className={styles.rowMeta}>
                      {blockNameById.get(u.blockId) ?? "—"} · {formatFloor(u.floor)}
                    </span>
                  </div>
                  <div className={styles.rowActions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Editar unidade ${u.number}`}
                      onClick={() => setFormState({ mode: "edit", unit: u })}
                    >
                      <Pencil size={14} /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Excluir unidade ${u.number}`}
                      onClick={() => setToDelete(u)}
                    >
                      <Trash2 size={14} /> Excluir
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {formState !== null && (
        <UnitFormModal
          condoId={condoId}
          unit={formState.mode === "edit" ? formState.unit : null}
          blocks={blocks ?? []}
          onClose={() => setFormState(null)}
        />
      )}

      <DeleteUnitDialog
        unit={toDelete}
        busy={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
