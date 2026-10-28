# Relatorio de modelos — ChargeGrid AI | Sprint 04

## Objetivo e metodologia
Comparar `gemma4:cloud` (nuvem) e `qwen3:4b` (local) no mesmo pipeline RAG V2.1, com as mesmas cinco perguntas e os mesmos documentos recuperados.

Parametros registrados no CSV enviado: `temperature=0`, `top_p=0.9`, `num_predict=512`, `k_inicial=20`, `k_final=5`, chunks de 512. Importante: embora o roteiro anterior previsse aumentar `num_predict` para 1024, **o arquivo efetivamente executado registra 512**; este relatorio adota o dado observado. A opcao `reasoning=False` foi sugerida na configuracao, mas sua aplicacao efetiva nao pode ser comprovada so pelo CSV.

## Resultados observados
| Metrica | Gemma 4 Cloud | Qwen3 4B |
|---|---:|---:|
| Perguntas executadas | 5 | 5 |
| Respostas finais utilizaveis | 5 | 0 |
| Tempo medio de pipeline | 4.82 s | 27.39 s |
| Tempo minimo | 2.40 s | 20.99 s |
| Tempo maximo | 8.73 s | 34.30 s |

O tempo inclui busca, reranking e geracao, e nao representa latencia pura de inferencia. Nuvem e hardware local nao sao ambientes equivalentes.

## Analise de qualidade
- **Gemma:** produziu cinco respostas em portugues, com referencias a documentos. As respostas de potencias (7/11/22 kW) e funcoes inteligentes tiveram respaldo nos trechos registrados; o procedimento de instalacao ficou incompleto.
- **Qwen:** nas quatro primeiras questoes produziu raciocinio extenso em ingles no campo `resposta`, sem conclusao util; na quinta exibiu bloco de raciocinio e uma recusa final com citacao `[Fonte N]` e indicacao inadequada da ANATEL para tarifas. A saida nao respeitou o formato solicitado.
- Para o Qwen, campos de faithfulness e answer relevancy ficam sem nota RAGAS: uma comparacao dessa metrica entre respostas finais equivalentes nao seria valida.

## Decisao
Escolher `gemma4:cloud` como modelo principal na demonstracao. O teste comprova **melhor adequacao a esta configuracao**, nao superioridade geral entre arquiteturas. Manter a falha do Qwen documentada como limitacao de integracao do modo thinking com o orcamento de tokens.

## Reprodutibilidade e riscos
Resultado especifico de 28/10/2026; cinco perguntas; apenas uma execucao por modelo; medicao de tempo nao isolou o custo de rede nem o aquecimento do modelo local. Aumentar o orcamento de tokens e revisar parsing de `reasoning`/`content` seria um experimento futuro, nao parte dos resultados validados.
