import { useState } from "react";
import { authedFetch } from "@/api/authedFetch";

interface Result {
  exportTickets: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

function isErrorBody(v: unknown): v is { error: string } {
  return typeof v === "object" && v !== null && "error" in v && typeof v.error === "string";
}

function messageFor(status: number, body: unknown): string {
  if (status === 403) return "Sem permissão para exportar chamados deste condomínio.";
  if (isErrorBody(body)) return body.error;
  return `Falha ao exportar (HTTP ${String(status)})`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function filenameFrom(headerValue: string | null): string {
  const fallback = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
  if (!headerValue) return fallback;
  const match = /filename="([^"]+)"/.exec(headerValue);
  return match?.[1] ?? fallback;
}

export function useExportTickets(condoId: string): Result {
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportTickets() {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch("/tickets/export", { condoId });
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        setError(messageFor(res.status, body));
        return;
      }
      const blob = await res.blob();
      const filename = filenameFrom(res.headers.get("Content-Disposition"));
      downloadBlob(blob, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return { exportTickets, isLoading, error };
}
