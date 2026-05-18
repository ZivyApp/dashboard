import { useState } from "react";
import { authedFetch } from "@/api/authedFetch";

interface Result {
  exportTickets: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

interface ErrorBody {
  error?: string;
}

function isErrorBody(v: unknown): v is ErrorBody {
  return typeof v === "object" && v !== null && (!("error" in v) || typeof v.error === "string");
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
        const msg =
          isErrorBody(body) && body.error ? body.error : `Falha ao exportar (HTTP ${res.status})`;
        setError(msg);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(cd);
      const filename = match?.[1] ?? `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return { exportTickets, isLoading, error };
}
