export interface AuthGetters {
  getAccessToken: () => Promise<string | undefined>;
  getActiveCondoId: () => string | undefined;
}

let getters: AuthGetters = {
  getAccessToken: () => Promise.resolve(undefined),
  getActiveCondoId: () => undefined,
};

export function configureApiAuth(opts: AuthGetters) {
  getters = opts;
}

export function getAuthGetters(): AuthGetters {
  return getters;
}

export async function applyAuthHeaders(request: Request, g: AuthGetters): Promise<Request> {
  const token = await g.getAccessToken();
  if (token) request.headers.set("Authorization", `Bearer ${token}`);
  const condoId = g.getActiveCondoId();
  if (condoId) request.headers.set("X-Condo-ID", condoId);
  return request;
}
