export interface AuthGetters {
  getAccessToken: () => Promise<string | undefined>;
  getActiveCondoId: () => string | undefined;
}

export async function applyAuthHeaders(request: Request, getters: AuthGetters): Promise<Request> {
  const token = await getters.getAccessToken();
  if (token) request.headers.set("Authorization", `Bearer ${token}`);
  const condoId = getters.getActiveCondoId();
  if (condoId) request.headers.set("X-Condo-ID", condoId);
  return request;
}
