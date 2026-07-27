import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/ui/Button/Button";
import { EmptyState } from "@/ui/AppShell/EmptyState";
import { Spinner } from "@/ui/Spinner/Spinner";
import type { Block } from "./block";
import { useBlocks } from "./useBlocks";
import { useUnits } from "./useUnits";
import { useDeleteBlock } from "./useDeleteBlock";
import { BlockFormModal } from "./BlockFormModal";
import { DeleteBlockDialog } from "./DeleteBlockDialog";
import styles from "./BlocksPage.module.css";

interface BlocksPageProps {
  condoId: string;
}

type FormState = { mode: "create" } | { mode: "edit"; block: Block } | null;

function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? singular : pluralForm;
}

export function BlocksPage({ condoId }: BlocksPageProps) {
  const { blocks, isPending, isError, refetch } = useBlocks(condoId);
  // Contagens derivadas; falha em units NÃO derruba a página (degrada p/ "—").
  const { units } = useUnits(condoId);
  const { deleteBlock, isPending: deleting } = useDeleteBlock(condoId);

  const [formState, setFormState] = useState<FormState>(null);
  const [toDelete, setToDelete] = useState<Block | null>(null);

  const unitCountByBlock = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of units ?? []) map.set(u.blockId, (map.get(u.blockId) ?? 0) + 1);
    return map;
  }, [units]);

  function handleConfirmDelete() {
    if (!toDelete) return;
    deleteBlock({ id: toDelete.id }, { onSuccess: () => setToDelete(null) });
  }

  return (
    <>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Blocos</h1>
          <p className={styles.sub}>
            {blocks !== undefined
              ? `${blocks.length} ${plural(blocks.length, "bloco", "blocos")} cadastrado${blocks.length === 1 ? "" : "s"}`
              : "Estrutura física do condomínio"}
          </p>
        </div>
        <div className={styles.actions}>
          <Button onClick={() => setFormState({ mode: "create" })}>
            <Plus size={14} /> Novo bloco
          </Button>
        </div>
      </header>

      {isPending ? (
        <Spinner />
      ) : isError ? (
        <EmptyState
          title="Não foi possível carregar os blocos"
          description="Verifique sua conexão e tente novamente."
          role="alert"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                void refetch();
              }}
            >
              Tentar novamente
            </Button>
          }
        />
      ) : blocks === undefined || blocks.length === 0 ? (
        <EmptyState
          title="Nenhum bloco cadastrado"
          description="Cadastre o primeiro bloco para organizar as unidades do condomínio."
          action={
            <Button onClick={() => setFormState({ mode: "create" })}>
              <Plus size={14} /> Cadastrar bloco
            </Button>
          }
        />
      ) : (
        <ul className={styles.list}>
          {blocks.map((b) => {
            const count = unitCountByBlock.get(b.id) ?? 0;
            return (
              <li key={b.id} className={styles.row}>
                <div className={styles.rowInfo}>
                  <span className={styles.rowTitle}>{b.name}</span>
                  <span className={styles.rowMeta}>
                    {b.description !== undefined ? `${b.description} · ` : ""}
                    {units === undefined ? "—" : `${count} ${plural(count, "unidade", "unidades")}`}
                  </span>
                </div>
                <div className={styles.rowActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Editar ${b.name}`}
                    onClick={() => setFormState({ mode: "edit", block: b })}
                  >
                    <Pencil size={14} /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Excluir ${b.name}`}
                    onClick={() => setToDelete(b)}
                  >
                    <Trash2 size={14} /> Excluir
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {formState !== null && (
        <BlockFormModal
          condoId={condoId}
          block={formState.mode === "edit" ? formState.block : null}
          onClose={() => setFormState(null)}
        />
      )}

      <DeleteBlockDialog
        block={toDelete}
        {...(toDelete !== null && units !== undefined
          ? { unitCount: unitCountByBlock.get(toDelete.id) ?? 0 }
          : {})}
        busy={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
