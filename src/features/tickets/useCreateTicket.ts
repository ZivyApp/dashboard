import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Ticket, TicketPriority } from "@/types/ticket";
import { isCompleteTicket } from "@/types/ticket";

export interface CreateTicketInput {
  title: string;
  resident_id: string;
  priority: TicketPriority;
  location: "unit" | "common_area";
  location_ref: string;
  description?: string;
}

export class CreateTicketError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;
  constructor(status: number, fieldErrors: Record<string, string>) {
    super(messageForStatus(status, fieldErrors));
    this.name = "CreateTicketError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Determines if `v` is a validation field-error map (400 response body),
 * e.g. `{ title: "obrigatório" }`. Objects that contain only a generic
 * `message` key are treated as non-field errors and excluded.
 */
function isFieldErrorMap(v: unknown): v is Record<string, string> {
  if (typeof v !== "object" || v === null) return false;
  const keys = Object.keys(v);
  if (keys.length === 0) return false;
  // A single `message` key is a generic error envelope, not a field map.
  if (keys.length === 1 && keys[0] === "message") return false;
  return Object.values(v).every((x) => typeof x === "string");
}

function messageForStatus(status: number, fieldErrors: Record<string, string>): string {
  if (status === 403) return "Sem permissão para criar chamados neste condomínio.";
  const first = Object.values(fieldErrors)[0];
  if (first) return first;
  return `Falha ao criar chamado (HTTP ${String(status)})`;
}

function toRequest(input: CreateTicketInput) {
  return {
    title: input.title,
    resident_id: input.resident_id,
    priority: input.priority,
    location: input.location,
    location_ref: input.location_ref,
    ...(input.description ? { description: input.description } : {}),
  };
}

export function useCreateTicket(condoId: string) {
  const qc = useQueryClient();
  const m = useMutation<Ticket, CreateTicketError | Error, CreateTicketInput>({
    mutationFn: async (input) => {
      const { data, error, response } = await api.POST("/tickets", { body: toRequest(input) });
      if (error || !data) {
        const fieldErrors = isFieldErrorMap(error) ? error : {};
        throw new CreateTicketError(response.status, fieldErrors);
      }
      if (!isCompleteTicket(data)) {
        throw new Error("TicketsService.create: payload incompleto na resposta de POST /tickets");
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets", condoId] }),
  });

  const fieldErrors = m.error instanceof CreateTicketError ? m.error.fieldErrors : {};
  const generalError = m.error ? m.error.message : null;

  return {
    create: (input: CreateTicketInput, opts?: { onSuccess?: () => void }) => m.mutate(input, opts),
    isPending: m.isPending,
    fieldErrors,
    generalError,
  };
}
