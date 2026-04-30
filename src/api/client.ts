import createClient from "openapi-fetch";
import type { paths } from "./types";
import { env } from "@/lib/env";

let getAccessToken: () => Promise<string | undefined> = () => Promise.resolve(undefined);
let getActiveCondoId: () => string | undefined = () => undefined;

export function configureApiAuth(opts: {
  getAccessToken: () => Promise<string | undefined>;
  getActiveCondoId: () => string | undefined;
}) {
  getAccessToken = opts.getAccessToken;
  getActiveCondoId = opts.getActiveCondoId;
}

export const api = createClient<paths>({
  baseUrl: env.CORE_API_URL,
});

api.use({
  async onRequest({ request }) {
    const token = await getAccessToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    const condoId = getActiveCondoId();
    if (condoId) request.headers.set("X-Condo-ID", condoId);
    return request;
  },
});
