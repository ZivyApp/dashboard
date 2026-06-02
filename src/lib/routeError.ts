export type RouteErrorKind = "connection" | "server" | "unknown";

// Erros com resposta HTTP (4xx/5xx) embrulhados pela queryFn seguem
// "VERBO /path failed" (formato de useMyCondos, a única query hoje exposta em
// beforeLoad). Falha de rede real NÃO passa por aqui: o openapi-fetch re-lança o
// TypeError do fetch, então ela cai no branch de TypeError abaixo. Este regex
// cobre apenas erros que tiveram resposta do servidor. Outras queries usam outro
// formato (ex.: useTicket → "Service.method(): falha em VERBO /path"); se uma
// delas passar a rodar em loader/beforeLoad, ampliar o regex (com cuidado para
// não gerar falso-positivo) ou o erro HTTP cairá em "unknown".
const API_ERROR_MESSAGE = /^(GET|POST|PUT|PATCH|DELETE) \/\S* failed$/;

export function classifyRouteError(error: unknown): RouteErrorKind {
  // Falha de fetch (offline, DNS, servidor inacessível) lança TypeError —
  // re-lançado pelo openapi-fetch e propagado pela queryFn sem embrulho.
  if (error instanceof TypeError) return "connection";
  // Erro com resposta HTTP (4xx/5xx) embrulhado pela queryFn: carrega `cause` e
  // a mensagem padrão. Recuperável por retry.
  // TODO(follow-up): reclassificar status 401 da `cause` para redirect ao
  // /login em vez de oferecer retry (sessão expirada não resolve com retry).
  if (
    error instanceof Error &&
    error.cause !== undefined &&
    API_ERROR_MESSAGE.test(error.message)
  ) {
    return "server";
  }
  return "unknown";
}
