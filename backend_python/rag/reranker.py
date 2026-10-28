import numpy as np
from functools import lru_cache

from sentence_transformers import CrossEncoder

from rag.retriever import buscar


MODELO_RERANKER = (
    "amberoad/bert-multilingual-passage-reranking-msmarco"
)


@lru_cache(maxsize=1)
def carregar_reranker():
    """Carrega o reranker multilíngue uma vez."""
    return CrossEncoder(
        MODELO_RERANKER,
        device="cpu",
        max_length=512,
    )


def buscar_v2(
    consulta: str,
    k_inicial: int = 20,
    k_final: int = 5,
    arquivo: str | None = None,
) -> list[dict]:
    """
    Recupera candidatos e aplica reranking multilíngue.
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


    scores = modelo.predict(
        pares,
        show_progress_bar=False,
    )

    scores = np.asarray(scores)

    # Alguns cross-encoders retornam uma pontuação
    # por classe, em vez de um único número.
    if scores.ndim == 2:
        if scores.shape[1] == 1:
            scores = scores[:, 0]
        elif scores.shape[1] == 2:
            # Classe 1 representa relevância.
            scores = scores[:, 1]
        else:
            raise ValueError(
                f"Formato de scores inesperado: {scores.shape}"
            )

    for item, score in zip(candidatos, scores):
        item["rerank_score"] = float(score)


    candidatos.sort(
        key=lambda item: item["rerank_score"],
        reverse=True,
    )

    return candidatos[:k_final]
