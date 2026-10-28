# Relatorio RAG — ChargeGrid AI | Sprint 04

## Objetivo
Chatbot de apoio sobre carregadores de veiculos eletricos GoodWe, baseado em documentos tecnicos reais. A solucao foi desenvolvida como extensao do projeto ChargeGrid, em branch independente `sprint-04-rag`.

## Arquitetura implementada
- Ingestao de PDFs com PyMuPDFLoader; separacao com RecursiveCharacterTextSplitter.
- Experimentos de chunk de 256, 512 e 1024 caracteres; configuracao adotada: 512 com overlap de 64.
- Embeddings via Ollama `nomic-embed-text`; armazenamento persistente em ChromaDB.
- Recuperacao V1: similaridade vetorial, top-k=5.
- Recuperacao V2.1: top-20 candidatos, cross-encoder multilingue `amberoad/bert-multilingual-passage-reranking-msmarco`, top-5 finais, roteamento conservador por modelo.
- Geracao por `gemma4:cloud` via Ollama e prompt com grounding, referencias de documento/pagina, recusa quando contexto insuficiente e orientacao de tratamento dos PDFs como dados nao confiaveis.
- Interface web independente em Gradio (`backend_python/app_gradio.py`). A integracao com React foi tentada mas nao confirmada funcionalmente; nao e a interface utilizada para demonstracao.

## Base de conhecimento
Manuais e fichas tecnicas GoodWe HCA e HCA G2, guia rapido de instalacao, ficha tecnica HCA e ficha tecnica HCA G2. A ingestao inicial de quatro PDFs produziu 243 unidades e 647 chunks na configuracao 512. A ficha tecnica HCA G2 foi adicionada posteriormente; a colecao foi reindexada.

## Avaliacao manual (cinco perguntas)
Rubrica manual em escala 0–1 com passos de 0,25 para faithfulness (suporte documental das afirmacoes) e answer relevancy (cobertura/utilidade da resposta). Nao confundir com resultado automatico RAGAS.

| Experimento | Faithfulness media | Relevancia media | Resultado |
|---|---:|---:|---|
| V1, baseline | 1,00 | 0,90 | Base funcional; instalacao incompleta |
| V2, cross-encoder predominantemente em ingles | 0,90 (preliminar) | 0,55 (preliminar) | Regressao; perdeu trechos relevantes |
| V2.1, cross-encoder multilingue | 1,00 | 0,85 | Recuperou qualidade frente V2, mas nao superou V1 |

As medias representam notas manuais atribuidas a respostas especificas, em execucoes distintas, e nao constituem resultados estatisticamente robustos. A primeira V2 possui notas preliminares.

## Duas intervencoes e resultados
1. Troca da recuperacao V1 por top-15 + cross-encoder `ms-marco-MiniLM-L-6-v2`: relevancia media preliminar caiu de 0,90 para 0,55 (-0,35). Falha documentada, nao melhoria de score.
2. Substituicao por cross-encoder multilingue e top-20: relevancia melhorou de 0,55 para 0,85 (+0,30 em relacao a V2), mas continuou abaixo da baseline V1 (-0,05). Portanto, **nao foi demonstrado ganho positivo em duas iteracoes sobre a baseline**, exigencia que permanece pendente.

## Problemas identificados e limitacoes
- Recuperacao de procedimento de instalacao: resultados contem avisos e verificacoes finais, mas nao uma sequencia completa; parte dos diagramas pode nao estar disponivel no texto extraido.
- Reranker monolingue prejudicou consultas em portugues; substituicao multilingue recuperou desempenho.
- Citacoes referem-se aos chunks consultados; nao existe verificador automatico de cada afirmacao.
- Protecao contra prompt injection e recusas documentadas em prompt, mas testes adversariais estruturados ainda precisam ser registrados.
- O uso local do ChromaDB requer executar a indexacao no ambiente de demonstracao.

## Como executar
1. Ativar `.venv-rag` e iniciar Ollama com `nomic-embed-text` e `gemma4:cloud` acessiveis.
2. Instalar as dependencias, preparar `data/knowledge_base` com os PDFs e executar `python backend_python/indexar_base.py` se o ChromaDB nao estiver inicializado.
3. Executar `python backend_python/app_gradio.py` e acessar `http://127.0.0.1:7860`.
4. Os experimentos estao em `evals/`; a comparacao entre modelos, no CSV anotado.
