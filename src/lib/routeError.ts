export type RouteErrorKind = "connection" | "unknown";

// Mensagens embrulhadas pelas queryFn seguem "VERBO /path failed".
const API_ERROR_MESSAGE = /^(GET|POST|PUT|PATCH|DELETE) \/\S* failed$/;

export function classifyRouteError(error: unknown): RouteErrorKind {
  // Falha de fetch (offline, DNS, servidor inacessível) lança TypeError.
  if (error instanceof TypeError) return "connection";
  // Erro HTTP embrulhado pela queryFn carrega `cause` e a mensagem padrão.
  if (
    error instanceof Error &&
    error.cause !== undefined &&
    API_ERROR_MESSAGE.test(error.message)
  ) {
    return "connection";
  }
  return "unknown";
}
