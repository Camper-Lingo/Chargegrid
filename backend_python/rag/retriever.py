
from rag.embeddings import criar_embeddings
from rag.vector_store import criar_colecao


def buscar(
    consulta: str,
    k: int = 5,
    arquivo: str | None = None,
) -> list[dict]:
    """
    Recupera trechos relevantes dos documentos GoodWe.

    Args:
        consulta: pergunta do usuário.
        k: número máximo de trechos retornados.
        arquivo: filtro opcional por nome do PDF.

    Returns:
        Lista com texto, fonte, página e distância.
    """
    if not consulta.strip():
        raise ValueError("A consulta não pode estar vazia.")

    colecao = criar_colecao()

    if colecao.count() == 0:
        raise RuntimeError(
            "ChromaDB vazio. Execute indexar_base.py."
        )

    embeddings = criar_embeddings()
    vetor = embeddings.embed_query(consulta)

    parametros = {
        "query_embeddings": [vetor],
        "n_results": min(k, colecao.count()),
        "include": [
            "documents",
            "metadatas",
            "distances",
        ],
    }

    if arquivo:
        parametros["where"] = {"arquivo": arquivo}

    resultados = colecao.query(**parametros)

    trechos = []

    textos = resultados["documents"][0]
    metadados = resultados["metadatas"][0]
    distancias = resultados["distances"][0]
    ids = resultados["ids"][0]

    for indice, texto in enumerate(textos):
        metadata = metadados[indice]

        trechos.append({
            "id": ids[indice],
            "texto": texto,
            "arquivo": metadata.get(
                "arquivo", "desconhecido"
            ),
            "pagina": metadata.get("pagina", -1),
            "categoria": metadata.get("categoria"),
            "distancia": float(distancias[indice]),
        })

    return trechos
