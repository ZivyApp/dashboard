import { useState, type FormEvent } from "react";
import { Modal } from "@/ui/Modal/Modal";
import { Button } from "@/ui/Button/Button";
import { useResidents } from "@/features/residents/useResidents";
import { useCreateTicket, type CreateTicketInput } from "./useCreateTicket";
import type { TicketPriority } from "@/types/ticket";
import styles from "./TicketCreateModal.module.css";

interface Props {
  condoId: string;
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
];

const LOCATION_OPTIONS: { value: "common_area" | "unit"; label: string }[] = [
  { value: "common_area", label: "Área comum" },
  { value: "unit", label: "Unidade" },
];

export function TicketCreateModal({ condoId, onClose }: Props) {
  const { residents, isPending: residentsLoading, isError: residentsError } = useResidents(condoId);
  const { create, isPending, fieldErrors, generalError } = useCreateTicket(condoId);

  const [title, setTitle] = useState("");
  const [residentId, setResidentId] = useState("");
  const [priority, setPriority] = useState<"" | TicketPriority>("");
  const [locationType, setLocationType] = useState<"common_area" | "unit">("common_area");
  const [locationRef, setLocationRef] = useState("");
  const [description, setDescription] = useState("");

  const pickable = (residents ?? []).filter((r) => r.status !== "PENDING");
  const canSubmit =
    title.trim() !== "" && residentId !== "" && priority !== "" && locationRef.trim() !== "";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // canSubmit includes priority !== "" — after this guard, TS narrows priority
    // to TicketPriority so it can be used directly in the input object.
    if (!canSubmit) return;
    const input: CreateTicketInput = {
      title: title.trim(),
      resident_id: residentId,
      priority,
      location: locationType,
      location_ref: locationRef.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
    };
    create(input, { onSuccess: onClose });
  }

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const banner = hasFieldErrors ? "Verifique os campos destacados." : generalError;

  return (
    <Modal open title="Novo chamado" onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit}>
        {banner ? (
          <p role="alert" className={styles.banner}>
            {banner}
          </p>
        ) : null}

        <label className={styles.field}>
          <span>Título *</span>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            aria-describedby={fieldErrors.title ? "err-title" : undefined}
          />
          {fieldErrors.title ? (
            <small id="err-title" className={styles.err}>
              {fieldErrors.title}
            </small>
          ) : null}
        </label>

        <label className={styles.field}>
          <span>Morador *</span>
          <select
            required
            value={residentId}
            disabled={residentsLoading || residentsError}
            onChange={(e) => {
              setResidentId(e.target.value);
            }}
            aria-describedby={fieldErrors.resident_id ? "err-resident" : undefined}
          >
            <option value="">
              {residentsLoading ? "Carregando…" : residentsError ? "Erro ao carregar" : "Selecione"}
            </option>
            {pickable.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {fieldErrors.resident_id ? (
            <small id="err-resident" className={styles.err}>
              {fieldErrors.resident_id}
            </small>
          ) : null}
        </label>

        <label className={styles.field}>
          <span>Prioridade *</span>
          <select
            required
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value as "" | TicketPriority);
            }}
          >
            <option value="">Selecione</option>
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.locationRow}>
          <label className={styles.field}>
            <span>Tipo de local</span>
            <select
              value={locationType}
              onChange={(e) => {
                setLocationType(e.target.value as "common_area" | "unit");
              }}
            >
              {LOCATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Localização *</span>
            <input
              type="text"
              required
              placeholder="ex.: Elevador B, Apto 101"
              value={locationRef}
              onChange={(e) => {
                setLocationRef(e.target.value);
              }}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span>Descrição</span>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
          />
        </label>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSubmit || isPending}>
            {isPending ? "Criando…" : "Criar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
