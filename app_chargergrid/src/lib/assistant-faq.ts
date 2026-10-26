// Assistente de dúvidas do ChargeGrid — FAQ simples.
//
// Roda inteiro no navegador: sem servidor, sem IA, sem chave de API.
// 1. Casos sensíveis ou complexos → encaminha para a Central de Atendimento GoodWe.
// 2. Demais dúvidas → resposta da pergunta mais parecida da lista FAQ.
//
// Para mudar o conteúdo, edite a lista FAQ abaixo.
// Para mudar o que vai para o atendente, edite REQUEST_TERMS, HUMAN_TERMS e SAFETY_TERMS.
// Contatos da central: src/lib/support.ts

export type FaqItem = { id: string; question: string; answer: string; keywords: string[] };

export const SUPPORT = "a Central de Atendimento GoodWe";

export const FAQ: FaqItem[] = [
  {
    id: "iniciar",
    question: "Como faço para começar uma recarga?",
    answer:
      "1) Cadastre seu carro na aba Veículo e deixe-o como ativo. 2) No Painel, toque em \"Visualizar código de conexão\". 3) No carregador, digite esse código de 6 caracteres. 4) Escolha quanto quer carregar, confira o preço e confirme o pagamento.",
    keywords: ["comecar", "iniciar", "carregar", "recarga", "usar", "primeira"],
  },
  {
    id: "codigo",
    question: "Onde encontro meu código de conexão?",
    answer:
      "Na aba Painel, toque em \"Visualizar código de conexão\". É um código de 6 letras e números que você digita na tela do carregador para ele reconhecer você e o seu carro.",
    keywords: ["codigo", "conexao", "onde", "encontrar", "achar", "painel", "carregador", "senha"],
  },
  {
    id: "codigo_erro",
    question: "O carregador não aceita meu código. O que faço?",
    answer:
      "Confira se digitou o código exatamente como aparece no Painel (letras maiúsculas e números). Verifique também se você tem um veículo cadastrado e marcado como ativo na aba Veículo. Se mesmo assim não funcionar, fale com " + SUPPORT + ".",
    keywords: ["nao aceita", "invalido", "erro", "codigo", "nao funciona", "nao encontrado", "recusou"],
  },
  {
    id: "preco",
    question: "Como é calculado o preço da recarga?",
    answer:
      "Preço = energia colocada no carro (kWh) × tarifa do horário. A energia depende da capacidade da bateria e de quantos % você quer adicionar. Se a recarga passar de uma faixa de horário para outra, cada parte é cobrada pela tarifa daquela faixa.",
    keywords: ["preco", "custo", "valor", "quanto", "custa", "calculado", "kwh", "pagar", "caro"],
  },
  {
    id: "tarifa",
    question: "Qual o horário mais barato para carregar?",
    answer:
      "A tarifa muda conforme o horário. Em geral o horário de ponta (fim da tarde, por volta das 17h às 20h em dias úteis) é o mais caro, e a madrugada, o começo do dia e os fins de semana são os mais baratos. Veja as faixas e preços atuais no Painel.",
    keywords: ["horario", "barato", "tarifa", "ponta", "melhor", "hora", "economizar", "economia", "fim de semana"],
  },
  {
    id: "tempo",
    question: "Quanto tempo demora para carregar?",
    answer:
      "O tempo depende da energia necessária e da potência. O carregamento usa a menor potência entre a do seu carro e a da estação. Exemplo: 30 kWh numa potência de 60 kW levam cerca de 30 minutos. O app mostra a estimativa antes de você confirmar.",
    keywords: ["tempo", "demora", "minutos", "rapido", "quanto tempo", "demorado", "potencia", "kw", "lento"],
  },
  {
    id: "veiculo",
    question: "Como cadastro ou troco meu veículo?",
    answer:
      "Vá na aba Veículo, busque o modelo no catálogo (ou preencha capacidade da bateria e potência) e informe a bateria atual. Se tiver mais de um carro, toque no que quer usar para deixá-lo como ativo — é ele que o carregador vai usar.",
    keywords: ["veiculo", "carro", "troco", "troca", "cadastrar", "cadastro", "trocar", "mudar", "ativo", "modelo", "adicionar", "excluir"],
  },
  {
    id: "bateria",
    question: "A porcentagem da bateria no app está errada.",
    answer:
      "A bateria é atualizada pelo app após cada recarga registrada. Se estiver diferente do carro, edite o valor da bateria atual na aba Veículo antes da próxima recarga para a simulação de preço ficar certa.",
    keywords: ["bateria", "porcentagem", "errada", "diferente", "atualizar", "nivel"],
  },
  {
    id: "eletropostos",
    question: "Como encontro um eletroposto perto de mim?",
    answer:
      "Na aba Eletropostos, permita o acesso à localização. O mapa mostra os postos parceiros ChargeGrid (com status Disponível ou Ocupada) e outros eletropostos públicos da região. Toque em um posto para ver o endereço.",
    keywords: ["eletroposto", "posto", "perto", "proximo", "mapa", "encontrar", "onde", "localizacao", "estacao"],
  },
  {
    id: "ocupada",
    question: "A estação está ocupada. O que faço?",
    answer:
      "Uma estação ocupada já tem um carro carregando. Na aba Eletropostos você pode ver outros postos parceiros disponíveis por perto ou aguardar a estação ser liberada.",
    keywords: ["ocupada", "ocupado", "indisponivel", "fila", "esperar", "cheia"],
  },
  {
    id: "pagamento",
    question: "Quais formas de pagamento são aceitas?",
    answer:
      "No carregador você pode pagar por Pix, cartão ou com o saldo da sua Carteira ChargeGrid (se o saldo cobrir o valor da recarga). O valor aparece antes de você confirmar.",
    keywords: ["pagamento", "pagar", "pix", "cartao", "credito", "debito", "forma", "saldo"],
  },
  {
    id: "carteira",
    question: "Como funciona a Carteira?",
    answer:
      "Na aba Carteira você adiciona créditos (de R$ 10 a R$ 1.000, por Pix ou cartão) e depois usa esse saldo para pagar as recargas no carregador. Ao adicionar R$ 50 ou mais você ganha um bônus: R$ 2 a partir de R$ 50, R$ 5 a partir de R$ 100 e R$ 12 a partir de R$ 200, e esse bônus é maior nos níveis Prata e Ouro.",
    keywords: ["carteira", "saldo", "creditos", "adicionar", "colocar dinheiro", "bonus", "wallet"],
  },
  {
    id: "gridback",
    question: "O que é o GridBack e como subo de nível?",
    answer:
      "GridBack é o cashback do ChargeGrid: parte do valor de cada recarga volta como bônus na sua Carteira. O nível depende de quanto você carregou nos últimos 30 dias: Bronze (2% de GridBack), Prata a partir de 50 kWh (4%) e Ouro a partir de 150 kWh (6%). Quanto maior o nível, maior também o bônus ao adicionar créditos.",
    keywords: ["gridback", "cashback", "nivel", "bronze", "prata", "ouro", "subir", "subo", "volta", "desconto", "pontos"],
  },
  {
    id: "bonus_validade",
    question: "Meu bônus expira?",
    answer:
      "Sim. O bônus e o GridBack valem por 90 dias. Ao pagar com a Carteira, o app usa primeiro o bônus que vence antes e só depois o saldo que você colocou. A Carteira avisa quando tem bônus vencendo nos próximos 7 dias.",
    keywords: ["expira", "vence", "validade", "venceu", "prazo", "bonus", "sumiu"],
  },
  {
    id: "historico",
    question: "Onde vejo minhas recargas anteriores?",
    answer:
      "Na aba Histórico você vê todas as recargas: data, energia (kWh), tarifa usada e valor pago.",
    keywords: ["historico", "anteriores", "recargas", "gastos", "extrato", "comprovante", "passadas"],
  },
  {
    id: "parou",
    question: "A recarga parou sozinha ou não começou.",
    answer:
      "Verifique se o cabo está bem encaixado no carro e se o carro não está com a bateria cheia. Se a recarga foi interrompida, ela aparece no Histórico. Se você foi cobrado sem carregar, fale com " + SUPPORT + " informando a data e o posto.",
    keywords: ["parou", "interrompeu", "nao comecou", "nao carrega", "problema", "cabo", "cobrado", "falha"],
  },
  {
    id: "login",
    question: "Fui desconectado do app.",
    answer:
      "Por segurança, a sessão expira depois de um tempo. Basta entrar de novo com seu e-mail e senha.",
    keywords: ["desconectado", "deslogado", "sessao", "expirou", "login", "entrar", "senha", "sair"],
  },
];

// ── Busca offline ──────────────────────────────────────────────────

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ");
}

// Palavras muito comuns valem menos: sozinhas não bastam para dar uma resposta
// (ex.: "posso levar meu cachorro no posto?" não é sobre eletropostos).
const GENERIC_WORDS = new Set([
  "carro", "carregar", "recarga", "recargas", "posto", "estacao", "horario", "hora",
  "cadastro", "cadastrar", "usar", "onde", "quanto", "como", "app", "valor",
  "erro", "problema", "forma", "mudar", "trocar", "pagar", "status", "nivel",
]);

function score(question: string, item: FaqItem) {
  const q = normalize(question);
  const words = new Set(q.split(/\s+/).filter(Boolean));
  let total = 0;
  for (const kw of item.keywords) {
    const weight = GENERIC_WORDS.has(kw) ? 0.5 : 1;
    if (kw.includes(" ")) total += q.includes(kw) ? 3 : 0;
    else if (words.has(kw)) total += 2 * weight;
    else if ([...words].some((w) => w.length >= 4 && w.startsWith(kw.slice(0, 5)))) total += 1 * weight;
  }
  return total;
}

/** Pontuação mínima para responder; abaixo disso, encaminha para o atendente. */
const MIN_SCORE = 2;

// ── Encaminhamento para atendente ──────────────────────────────────
// Dúvidas que o assistente NÃO deve tentar resolver sozinho.

const SAFETY_TERMS = ["fogo", "fumaca", "incendio", "choque", "faisca", "pegando fogo", "queimando", "cheiro de queimado"];

const REQUEST_TERMS = ["atendente", "humano", "pessoa", "falar com alguem", "suporte", "central", "sac", "ouvidoria"];

const HUMAN_TERMS = [
  // dinheiro
  "reembolso", "estorno", "estornar", "devolucao", "devolver", "cobrado duas vezes", "cobranca indevida",
  "cobrado errado", "cobrado a mais", "em dobro", "nota fiscal", "cancelar pagamento",
  // reclamação / jurídico
  "reclamacao", "reclamar", "procon", "advogado", "indenizacao", "fui cobrado",
  // dano / defeito
  "defeito", "quebrado", "quebrou", "danificou", "danificado", "estragou", "acidente", "bateu", "arranhou",
  // conta
  "excluir conta", "apagar conta", "deletar conta", "meus dados", "lgpd",
];

type EscalationReason = "safety" | "request" | "human" | "unknown" | null;

function hasTerm(text: string, terms: string[]) {
  // palavra/frase inteira, aceitando plural (s/es)
  return terms.some((t) => new RegExp(`(^| )${t}(s|es)?( |$)`).test(text));
}

export function escalationReason(question: string): EscalationReason {
  const q = normalize(question).replace(/\s+/g, " ").trim();
  if (hasTerm(q, SAFETY_TERMS)) return "safety";
  if (hasTerm(q, REQUEST_TERMS)) return "request";
  if (hasTerm(q, HUMAN_TERMS)) return "human";
  return null;
}

export function escalationAnswer(reason: Exclude<EscalationReason, null>) {
  const answers = {
    safety:
      "⚠️ Por segurança: não toque no carregador nem no cabo, afaste-se e, se houver fogo ou fumaça, ligue para os Bombeiros (193). Depois, registre a ocorrência com a Central de Atendimento GoodWe pelos canais abaixo.",
    request:
      "Claro! Fale com um atendente da Central de Atendimento GoodWe por um dos canais abaixo.",
    human:
      "Esse tipo de situação precisa ser analisado por uma pessoa. Um atendente da Central de Atendimento GoodWe pode te ajudar com o seu caso. É só escolher um dos canais abaixo.",
    unknown:
      "Essa dúvida é mais específica do que eu consigo responder por aqui. Para não te deixar sem solução, fale com um atendente da Central de Atendimento GoodWe pelos canais abaixo.",
  };
  return { answer: answers[reason], source: "faq" as const, related: [] as string[], escalate: true };
}

export function offlineAnswer(question: string) {
  const ranked = [...FAQ].sort((a, b) => score(question, b) - score(question, a));
  const best = ranked[0];
  const bestScore = best ? score(question, best) : 0;
  const wordCount = normalize(question).split(/\s+/).filter(Boolean).length;

  // Não achou nada, ou pergunta longa com correspondência fraca = dúvida complicada
  if (!best || bestScore < MIN_SCORE || (wordCount >= 15 && bestScore <= 2)) {
    return escalationAnswer("unknown");
  }

  return {
    answer: best.answer,
    source: "faq" as const,
    related: ranked.slice(1, 4).filter((i) => score(question, i) >= MIN_SCORE).map((i) => i.question),
    escalate: false,
  };
}


/** Resposta completa sem IA: casos sensíveis vão para o atendente, o resto vem da FAQ. */
export function answerLocally(question: string) {
  const reason = escalationReason(question);
  return reason ? escalationAnswer(reason) : offlineAnswer(question);
}
