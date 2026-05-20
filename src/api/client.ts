import createClient from "openapi-fetch";
import type { paths } from "./types";
import { env } from "@/lib/env";
import { applyAuthHeaders, getAuthGetters } from "./auth";

export const api = createClient<paths>({
  baseUrl: env.CORE_API_URL,
});

api.use({
  onRequest: ({ request }) => applyAuthHeaders(request, getAuthGetters()),
});
