
from functools import lru_cache

from sentence_transformers import CrossEncoder

from rag.retriever import buscar


@lru_cache(maxsize=1)
def carregar_reranker():
    """
    Carrega o cross-encoder uma única vez.
    """
    return CrossEncoder(
        "cross-encoder/ms-marco-MiniLM-L-6-v2",
        device="cpu"
    )


def buscar_v2(
    consulta: str,
    k_inicial: int = 15,
    k_final: int = 5,
    arquivo: str | None = None,
) -> list[dict]:
    """
    Busca 15 candidatos no ChromaDB e
    seleciona os 5 melhores via reranking.
    """

    candidatos = buscar(
        consulta=consulta,
        k=k_inicial,
        arquivo=arquivo,
    )

    if not candidatos:
        return []

    modelo = carregar_reranker()

    pares = [
        (consulta, item["texto"])
        for item in candidatos
    ]

    scores = modelo.predict(pares)

    for item, score in zip(candidatos, scores):
        item["rerank_score"] = float(score)

    candidatos.sort(
        key=lambda item: item["rerank_score"],
        reverse=True
    )

    return candidatos[:k_final]
