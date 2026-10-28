
import csv
import json
from pathlib import Path

from rag.pipeline_v2 import responder_v2


ROOT = Path(__file__).resolve().parent.parent
EVALS = ROOT / "evals"


def main():
    perguntas = json.loads(
        (EVALS / "perguntas_avaliacao.json")
        .read_text(encoding="utf-8")
    )

    resultados = []

    for item in perguntas:
        print(
            f"\nAvaliando V2: questão {item['id']}"
        )

        resultado = responder_v2(
            pergunta=item["pergunta"],
            arquivo=item.get("arquivo"),
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
            "observacoes": "",
        })

        print(resultado["resposta"][:500])

    destino = EVALS / "avaliacao_v2.csv"

    with destino.open(
        "w",
        encoding="utf-8-sig",
        newline=""
    ) as arquivo:
        writer = csv.DictWriter(
            arquivo,
            fieldnames=resultados[0].keys(),
        )
        writer.writeheader()
        writer.writerows(resultados)

    print("\nAvaliação V2 salva em:", destino)


if __name__ == "__main__":
    main()
