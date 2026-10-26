// Contatos da Central de Atendimento GoodWe usados pelo assistente.
// Canal deixado vazio ("") não aparece no app.
// Pode escrever os números do jeito que quiser: o código limpa o formato.

export const SUPPORT_CENTER = {
  name: "Central de Atendimento GoodWe",
  whatsapp: "+55 (47) 99954-5370",
  phone: "(11) 4040-2283",
  email: "servico.br@goodwe.com",
  hours: "Segunda a sexta, das 8h às 18h",
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");

export function whatsappLink(message: string) {
  const number = onlyDigits(SUPPORT_CENTER.whatsapp);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function emailLink(subject: string, body: string) {
  if (!SUPPORT_CENTER.email) return null;
  return `mailto:${SUPPORT_CENTER.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function phoneLink() {
  const number = onlyDigits(SUPPORT_CENTER.phone);
  if (!number) return null;
  return `tel:+55${number}`;
}
