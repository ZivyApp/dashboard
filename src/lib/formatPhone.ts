/**
 * Formata um telefone para exibição legível, preservando todos os dígitos.
 * Na tela de aprovação o gestor precisa do número completo para confirmar a
 * identidade do morador — por isso exibimos sem máscara.
 *
 * "+5511999994312" → "+55 11 99999-4312"
 * "11999994312"    → "11 99999-4312"
 */
export function formatPhone(phone: string | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return phone;

  const hasCountry = digits.length > 11;
  const country = hasCountry ? digits.slice(0, digits.length - 11) : "";
  const local = hasCountry ? digits.slice(digits.length - 11) : digits;

  const ddd = local.slice(0, 2);
  const rest = local.slice(2); // 8 ou 9 dígitos
  const splitAt = rest.length - 4;
  const prefix = rest.slice(0, splitAt);
  const last4 = rest.slice(splitAt);

  const countryPart = country ? `+${country} ` : "";
  return `${countryPart}${ddd} ${prefix}-${last4}`;
}
