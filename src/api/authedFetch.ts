import { env } from "@/lib/env";
import { applyAuthHeaders, getAuthGetters } from "./auth";

interface AuthedFetchOpts {
  condoId?: string;
  query?: Record<string, string>;
  method?: "GET" | "POST" | "PUT" | "DELETE";
}

/**
 * fetch cru autenticado para endpoints que devolvem non-JSON (ex.: CSV).
 * Reusa `applyAuthHeaders` para evitar divergência de headers com o middleware
 * do openapi-fetch (`src/api/client.ts`).
 */
export async function authedFetch(path: string, opts: AuthedFetchOpts = {}): Promise<Response> {
  const url = new URL(path.startsWith("http") ? path : `${env.CORE_API_URL}${path}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      url.searchParams.set(k, v);
    }
  }

  const baseGetters = getAuthGetters();
  const getters =
    opts.condoId !== undefined
      ? { ...baseGetters, getActiveCondoId: () => opts.condoId }
      : baseGetters;

  const request = new Request(url.toString(), { method: opts.method ?? "GET" });
  await applyAuthHeaders(request, getters);
  return fetch(request);
}
