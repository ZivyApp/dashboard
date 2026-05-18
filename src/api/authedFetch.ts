import { env } from "@/lib/env";
import { getAuthGetters } from "./auth";

interface AuthedFetchOpts {
  condoId?: string;
  query?: Record<string, string>;
  method?: "GET" | "POST" | "PUT" | "DELETE";
}

/**
 * fetch cru autenticado para endpoints que devolvem non-JSON (ex.: CSV).
 * Aplica Bearer + X-Condo-ID (mesma lógica do openapi-fetch via applyAuthHeaders).
 */
export async function authedFetch(path: string, opts: AuthedFetchOpts = {}): Promise<Response> {
  const getters = getAuthGetters();
  const token = await getters.getAccessToken();
  const condoId = opts.condoId ?? getters.getActiveCondoId();

  const url = new URL(path.startsWith("http") ? path : `${env.CORE_API_URL}${path}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (condoId) headers["X-Condo-ID"] = condoId;

  return fetch(url.toString(), {
    method: opts.method ?? "GET",
    headers,
  });
}
