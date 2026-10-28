
from rag.pipeline import responder
from rag.pipeline_v2 import responder_v2


perguntas = [
    (
        "Qual é o procedimento de instalação "
        "do carregador HCA?",
        "GW_HCA Series_Quick Installation Guide-POLY.pdf"
    ),
    (
        "Quais são as potências nominais "
        "dos modelos HCA G2?",
        None
    ),
]


for pergunta, arquivo in perguntas:
    print("\n" + "=" * 70)
    print("PERGUNTA:", pergunta)
    print("=" * 70)

    v1 = responder(
        pergunta=pergunta,
        arquivo=arquivo
    )

    v2 = responder_v2(
        pergunta=pergunta,
        arquivo=arquivo
    )

    print("\n--- RAG V1 ---")
    print(v1["resposta"])

    print("\n--- RAG V2 ---")
    print(v2["resposta"])

    print("\nFONTES V2:")
    for fonte in v2["fontes"]:
        print(
            fonte["arquivo"],
            "| Página:", fonte["pagina"],
            "| Rerank:",
            round(fonte["rerank_score"], 3)
        )

    print("\nFamília:", v2["familia_identificada"])
    print("Filtro:", v2["arquivo_filtrado"])
