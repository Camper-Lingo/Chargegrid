
from rag.pipeline import criar_modelo
from rag.reranker import buscar_v2
from rag.model_router import (
    identificar_familia,
    selecionar_arquivo,
)
from rag.prompt_rag import SYSTEM_PROMPT_V2


def responder_v2(
    pergunta: str,
    arquivo: str | None = None,
    k_inicial: int = 20,
    k_final: int = 5,
) -> dict:
    """
    Pipeline RAG V2:
    seleção de fonte -> busca -> reranking ->
    geração com grounding e citações.
    """

    arquivo_selecionado = selecionar_arquivo(
        pergunta, arquivo
    )

    trechos = buscar_v2(
        consulta=pergunta,
        k_inicial=k_inicial,
        k_final=k_final,
        arquivo=arquivo_selecionado,
    )

    if not trechos:
        return {
            "resposta": (
                "Não encontrei informações suficientes "
                "na documentação disponível."
            ),
            "fontes": [],
            "contextos": [],
            "prompt_version": "v2",
        }

    blocos = []
    fontes = []

    for i, trecho in enumerate(trechos, 1):
        fonte_id = f"Fonte {i}"
        pagina = trecho["pagina"]

        pagina_pdf = (
            pagina + 1
            if isinstance(pagina, int) and pagina >= 0
            else "N/D"
        )

        blocos.append(
            f"[{fonte_id}]\n"
            f"Documento: {trecho['arquivo']}\n"
            f"Página PDF: {pagina_pdf}\n"
            f"Chunk: {trecho['id']}\n"
            f"Conteúdo:\n{trecho['texto']}"
        )

        fontes.append({
            "id": fonte_id,
            "arquivo": trecho["arquivo"],
            "pagina": str(pagina_pdf),
            "chunk_id": trecho["id"],
            "rerank_score": trecho["rerank_score"],
        })

    contexto = "\n\n---\n\n".join(blocos)

    familia = identificar_familia(pergunta)

    resposta_modelo = criar_modelo().invoke([
        ("system", SYSTEM_PROMPT_V2),
        (
            "human",
            f"<familia>{familia or 'não especificada'}</familia>\n"
            f"<documentos>\n{contexto}\n</documentos>\n"
            f"<pergunta>\n{pergunta}\n</pergunta>"
        ),
    ])

    return {
        "resposta": resposta_modelo.content,
        "fontes": fontes,
        "contextos": [t["texto"] for t in trechos],
        "prompt_version": "v2",
        "familia_identificada": familia,
        "arquivo_filtrado": arquivo_selecionado,
    }
