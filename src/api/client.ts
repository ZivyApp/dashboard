import createClient from "openapi-fetch";
import type { paths } from "./types";
import { env } from "@/lib/env";
import { applyAuthHeaders, type AuthGetters } from "./auth";

let auth: AuthGetters = {
  getAccessToken: () => Promise.resolve(undefined),
  getActiveCondoId: () => undefined,
};

export function configureApiAuth(opts: AuthGetters) {
  auth = opts;
}

export const api = createClient<paths>({
  baseUrl: env.CORE_API_URL,
});

api.use({
  onRequest: ({ request }) => applyAuthHeaders(request, auth),
});
