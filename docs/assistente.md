# ChargeGrid — Assistente de dúvidas (FAQ)

Chat simples ("Dúvidas?") em todas as telas logadas do **app_chargergrid**.
Responde as dúvidas comuns do motorista e, nos casos maiores, encaminha para a
**Central de Atendimento GoodWe**.

Roda inteiro no navegador: **sem servidor, sem IA e sem chave de API**.

## Como funciona

1. **Encaminhamento para o atendente**, quando:
   - o usuário pede ("quero falar com um atendente", "suporte", "humano"...);
   - o assunto exige uma pessoa: cobrança, reembolso, estorno, defeito, dano, reclamação, Procon, dados da conta;
   - é emergência (fogo, fumaça, choque): antes, orienta a se afastar e ligar 193;
   - a dúvida não está no FAQ, ou é longa e não bate com nenhuma pergunta.
2. **Resposta do FAQ:** compara as palavras da pergunta com as palavras-chave de
   cada item e mostra a resposta mais parecida, com sugestões relacionadas.

O botão **"Falar com um atendente"** (e o ícone de headset no topo do chat) mostra
os canais da central, com um resumo das dúvidas já preenchido na mensagem.

## Arquivos

| Arquivo | O quê |
|---|---|
| `app_chargergrid/src/lib/assistant-faq.ts` | Perguntas (inclui Carteira, GridBack e níveis), respostas, palavras-chave e regras de encaminhamento |
| `app_chargergrid/src/lib/support.ts` | **Contatos da Central GoodWe (preencher)** |
| `app_chargergrid/src/components/assistant-chat.tsx` | O chat (botão "Dúvidas?" + janela) |
| `app_chargergrid/src/components/app-shell.tsx` | Mostra o chat em todas as telas logadas |

## Como editar

- **Nova pergunta:** adicione um item na lista `FAQ` de `assistant-faq.ts`:
  ```ts
  {
    id: "reembolso",
    question: "Como peço reembolso?",
    answer: "Fale com a Central de Atendimento GoodWe informando a data e o posto.",
    keywords: ["reembolso", "devolver", "dinheiro", "estorno"],
  },
  ```
  Palavras-chave sem acento e em minúsculas.
- **O que vai para o atendente:** listas `REQUEST_TERMS`, `HUMAN_TERMS` e `SAFETY_TERMS` em `assistant-faq.ts`.
- **Contatos da central:** `support.ts` (WhatsApp, telefone, e-mail, horário). Canal vazio não aparece.
