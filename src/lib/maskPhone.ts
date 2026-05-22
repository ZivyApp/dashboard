/**
 * Mascara um telefone para exibição: preserva o DDI (quando presente), o DDD,
 * o primeiro dígito do número e os 4 últimos; oculta o miolo com `*`.
 * Trabalha sobre os dígitos; números curtos demais voltam crus.
 *
 * "+5511999994312" → "+55 11 9****-4312"
 * "11999994312"    → "11 9****-4312"
 */
export function maskPhone(phone: string | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return phone;

  const hasCountry = digits.length > 11;
  const country = hasCountry ? digits.slice(0, digits.length - 11) : "";
  const local = hasCountry ? digits.slice(digits.length - 11) : digits;

  const ddd = local.slice(0, 2);
  const rest = local.slice(2); // 8 ou 9 dígitos
  const first = rest.slice(0, 1);
  const last4 = rest.slice(-4);
  const masked = "*".repeat(Math.max(0, rest.length - 5));

  const prefix = country ? `+${country} ` : "";
  return `${prefix}${ddd} ${first}${masked}-${last4}`;
}
