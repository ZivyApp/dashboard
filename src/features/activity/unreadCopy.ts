export function unreadCopy(n: number): string {
  if (n === 0) return "Tudo em dia — nenhum item não lido";
  if (n === 1) return "1 item não lido";
  return `${n} itens não lidos`;
}
