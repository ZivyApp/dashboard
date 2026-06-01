export type RouteErrorKind = "connection" | "unknown";

// Casa o formato "VERBO /path failed" usado por queryFn como a de useMyCondos
// (a única query hoje exposta em beforeLoad). Outras queries usam formatos
// diferentes (ex.: useTicket → "Service.method(): falha em VERBO /path"); se uma
// delas passar a rodar em loader/beforeLoad, ampliar este regex (com cuidado para
// não gerar falso-positivo) ou o erro cairá em "unknown".
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
