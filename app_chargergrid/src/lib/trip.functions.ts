
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUserSession } from "@/lib/server-auth";
import {
  runTrip,
  summarizeForAi,
  type TripResult,
} from "@/lib/trip-core";

// ===================================================
// CHARGEGRID AI - GEMINI GRATUITO
// ===================================================

const chatInput = z.object({
  message: z.string().trim().min(1).max(1000),

  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().max(6000),
    })
  ).max(20).default([]),

  accessToken: z.string().min(20),
});

const tripArgs = z.object({
  origem: z.string().trim().min(2),
  destino: z.string().trim().min(2),

  bateria_inicial_pct: z.number()
    .min(0)
    .max(100)
    .optional(),

  horario_saida: z.string().optional(),
});

const TRIP_TOOL = {
  name: "planejar_viagem",

  description:
    "Calcula uma viagem rodoviária no Brasil usando " +
    "os dados cadastrados do veículo, rotas, energia, " +
    "carregadores disponíveis na base e custos estimados.",

  parameters: {
    type: "object",

    properties: {
      origem: {
        type: "string",
        description: "Cidade ou endereço de partida",
      },

      destino: {
        type: "string",
        description: "Cidade ou endereço de destino",
      },

      bateria_inicial_pct: {
        type: "number",
        description: "Bateria inicial em porcentagem, de 0 a 100",
      },

      horario_saida: {
        type: "string",
        description: "Data e hora no formato YYYY-MM-DDTHH:MM",
      },
    },

    required: ["origem", "destino"],
  },
};

function tripSystemPrompt() {
  const now = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });

  return `
Você é o ChargeGrid AI, assistente de viagens
para motoristas de veículos elétricos.

Horário atual de Brasília: ${now}.

REGRAS:
1. Responda em português brasileiro.
2. Seja claro, simpático e objetivo.
3. Para calcular uma viagem, use planejar_viagem.
4. Se faltar origem ou destino, pergunte ao usuário.
5. Nunca invente distância, carregador, autonomia,
   tempo, disponibilidade ou preço.
6. Utilize somente os valores retornados pela ferramenta.
7. A disponibilidade real dos carregadores NÃO está
   confirmada. Trate as paradas como sugestões estimadas.
8. Se a viagem não for viável, explique o motivo.
9. Se o consumo for estimado, informe isso.
10. Não afirme que carregadores estão funcionando
    ou livres sem dados que comprovem isso.
11. Restaurantes ainda não estão integrados.
    Se o usuário pedir alimentação, informe que
    essa consulta será adicionada futuramente.
12. Responda apenas sobre veículos elétricos,
    autonomia, viagens e recargas.

IMPORTANTE SOBRE CARREGADORES:

Existem dois tipos de carregadores no sistema:

1. Carregadores integrados ao ChargeGrid/GoodWe:
   são utilizados no cálculo automático da viagem.

2. Carregadores públicos do Open Charge Map:
   aparecem como pontos azuis no mapa, mas ainda
   não são utilizados no cálculo da viabilidade.

Se não houver carregador ChargeGrid/GoodWe ao alcance,
mas existirem carregadores públicos encontrados:

- NÃO diga que não existem carregadores na rota.
- Explique que não há carregadores integrados ao
  ChargeGrid suficientes para concluir o planejamento.
- Informe que existem carregadores públicos cadastrados
  próximos ao trajeto.
- Deixe claro que esses pontos ainda não foram
  verificados quanto a disponibilidade, conector,
  acesso e desvio pela estrada.
- Não afirme que a viagem é viável apenas porque
  esses pontos aparecem no mapa.

Quando houver planejamento, apresente:
- Distância e tempo estimado
- Bateria inicial e prevista na chegada
- Necessidade de recarga
- Paradas sugeridas
- Custos estimados
- Alertas de segurança

Os postos públicos do Open Charge Map são apenas
candidatos informativos. Eles ainda NÃO foram
validados quanto à compatibilidade do conector,
ao desvio rodoviário, à disponibilidade ou ao preço,
e NÃO fazem parte do cálculo de viabilidade.

Nunca apresente um posto público como parada
confirmada ou garantida. Diferencie sempre o
roteiro calculado das opções públicas para consulta.

`;
}

type GeminiPart = {
  text?: string;

  functionCall?: {
    name: string;
    args?: Record<string, unknown>;
    id?: string;
  };

  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
    id?: string;
  };

  thoughtSignature?: string;
};

type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

type GeminiResponse = {
  candidates?: Array<{
    content?: GeminiContent;
  }>;
};

// Faz uma chamada à API REST do Gemini.
// Executa exclusivamente no servidor.
async function callGemini(
  apiKey: string,
  model: string,
  contents: GeminiContent[]
): Promise<GeminiContent> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },

      signal: AbortSignal.timeout(45000),

      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: tripSystemPrompt() }],
        },

        contents,

        tools: [{
          functionDeclarations: [TRIP_TOOL],
        }],

        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (response.status === 429) {
    throw new Error(
      "A cota gratuita da IA foi atingida. " +
      "Tente novamente mais tarde."
    );
  }

  if (response.status === 404) {
    throw new Error(
      "Modelo Gemini indisponível. Confira GEMINI_MODEL."
    );
  }

  if (!response.ok) {
    console.error("Gemini HTTP:", response.status);

    throw new Error(
      "O Gemini não respondeu agora. " +
      "Você ainda pode usar o formulário de viagem."
    );
  }

  const body = await response.json() as GeminiResponse;

  const content = body.candidates?.[0]?.content;

  if (!content?.parts?.length) {
    throw new Error(
      "A IA não retornou uma resposta válida."
    );
  }

  return content;
}

// ===================================================
// FUNÇÃO UTILIZADA PELO CHAT REACT
// ===================================================

export const askTripAssistant = createServerFn({
  method: "POST",
})
  .inputValidator((input) => chatInput.parse(input))
  .handler(async ({ data }) => {

    // Carrega .env no processo do servidor.
    const { config } = await import("dotenv");
    config({ path: ".env" });

    const apiKey = process.env["GEMINI_API_KEY"];

    const model =
      process.env["GEMINI_MODEL"] ||
      "gemini-3.1-flash-lite";

    if (!apiKey) {
      return {
        answer:
          "A IA ainda não está configurada. " +
          "Adicione GEMINI_API_KEY ao app_chargergrid/.env.",
        trip: null as TripResult | null,
        aiEnabled: false,
      };
    }

    // Valida o token Supabase no servidor.
    const session = await requireUserSession(
      data.accessToken
    );

    const history = data.history.slice(-10);

    while (
      history.length &&
      history[0]?.role !== "user"
    ) {
      history.shift();
    }

    const contents: GeminiContent[] = history.map(
      (item) => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: item.content }],
      })
    );

    contents.push({
      role: "user",
      parts: [{ text: data.message }],
    });

    let trip: TripResult | null = null;

    // Limita a quantidade de interações da IA.
    for (let step = 0; step < 3; step++) {

      let response: GeminiContent;

      try {
        response = await callGemini(
          apiKey,
          model,
          contents
        );
      } catch (error) {
        if (trip) {
          return {
            answer:
              "A viagem foi calculada, mas a IA não " +
              "conseguiu elaborar a explicação. " +
              "Confira o roteiro exibido no mapa.",
            trip,
            aiEnabled: true,
          };
        }

        throw error;
      }

      const calls = response.parts.filter(
        (part) => Boolean(part.functionCall)
      );

      // Modelo respondeu sem solicitar ferramenta.
      if (!calls.length) {
        const answer = response.parts
          .map((part) => part.text ?? "")
          .join("")
          .trim();

        return {
          answer:
            answer ||
            "Não consegui elaborar a resposta. " +
              "Tente reformular a pergunta.",
          trip,
          aiEnabled: true,
        };
      }

      // Preserva a resposta original do modelo,
      // incluindo assinaturas de pensamento.
      contents.push(response);

      const resultParts: GeminiPart[] = [];

      for (const part of calls) {
        const call = part.functionCall!;

        if (call.name !== "planejar_viagem") {
          resultParts.push({
            functionResponse: {
              name: call.name,
              ...(call.id ? { id: call.id } : {}),
              response: {
                error: "Ferramenta desconhecida",
              },
            },
          });

          continue;
        }

        const parsed = tripArgs.safeParse(call.args);

        if (!parsed.success) {
          resultParts.push({
            functionResponse: {
              name: call.name,
              ...(call.id ? { id: call.id } : {}),
              response: {
                error:
                  "Origem, destino ou bateria inválidos. " +
                  "Solicite os dados corretos ao motorista.",
              },
            },
          });

          continue;
        }

        try {
          const args = parsed.data;

          trip = await runTrip(
            session.supabase,
            session.userId,
            {
              origin: args.origem,
              destination: args.destino,

              startBatteryPct:
                args.bateria_inicial_pct,

              departure: args.horario_saida,
            }
          );

          resultParts.push({
            functionResponse: {
              name: call.name,
              ...(call.id ? { id: call.id } : {}),
              response: {
                result: summarizeForAi(trip),
              },
            },
          });

        } catch (error) {
          resultParts.push({
            functionResponse: {
              name: call.name,
              ...(call.id ? { id: call.id } : {}),
              response: {
                error:
                  error instanceof Error
                    ? error.message
                    : "Erro ao planejar a viagem",
              },
            },
          });
        }
      }

      contents.push({
        role: "user",
        parts: resultParts,
      });
    }

    return {
      answer:
        "Não consegui concluir a explicação. " +
        "Verifique o roteiro ou use o formulário.",
      trip,
      aiEnabled: true,
    };
  });
