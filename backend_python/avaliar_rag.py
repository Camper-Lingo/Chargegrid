
import csv
import json
from pathlib import Path

from rag.pipeline import responder

ROOT = Path(__file__).resolve().parent.parent
EVALS_DIR = ROOT / "evals"


def executar_avaliacao():
    caminho = EVALS_DIR / "perguntas_avaliacao.json"

    with open(caminho, encoding="utf-8") as f:
        perguntas = json.load(f)

    resultados = []

    for item in perguntas:
        print("\n" + "=" * 60)
        print("QUESTÃO:", item["id"])
        print("PERGUNTA:", item["pergunta"])

        resultado = responder(
            pergunta=item["pergunta"],
            arquivo=item["arquivo"],
            k=5
        )

        print("\nRESPOSTA:")
        print(resultado["resposta"])

        print("\nFONTES:")
        for fonte in resultado["fontes"]:
            print(
                fonte["arquivo"],
                "página",
                fonte["pagina"]
            )

        resultados.append({
            "id": item["id"],
            "pergunta": item["pergunta"],
            "resposta": resultado["resposta"],
            "fontes": json.dumps(
                resultado["fontes"],
                ensure_ascii=False
            ),
            "faithfulness": "",
            "answer_relevancy": "",
            "observacoes": ""
        })

    destino = EVALS_DIR / "avaliacao_v1.csv"

    with open(
        destino,
        "w",
        encoding="utf-8-sig",
        newline=""
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=resultados[0].keys()
        )
        writer.writeheader()
        writer.writerows(resultados)

    print("\nAVALIAÇÃO V1 GERADA!")
    print("Arquivo:", destino)


if __name__ == "__main__":
    executar_avaliacao()
