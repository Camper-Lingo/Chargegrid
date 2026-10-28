
import csv
import json
import time
from pathlib import Path

from rag.pipeline_v2 import responder_v2


ROOT = Path(__file__).resolve().parent.parent
EVALS = ROOT / "evals"

MODELOS = [
    "gemma4:cloud",
    "qwen3:4b",
]


def main():
    perguntas = json.loads(
        (EVALS / "perguntas_avaliacao.json")
        .read_text(encoding="utf-8")
    )

    resultados = []

    for modelo in MODELOS:
        print(f"\n{'=' * 55}")
        print("MODELO:", modelo)
        print("=" * 55)

        for item in perguntas:
            print(
                f"\nQuestão {item['id']}: "
                f"{item['pergunta']}"
            )

            inicio = time.perf_counter()

            try:
                resultado = responder_v2(
                    pergunta=item["pergunta"],
                    arquivo=item.get("arquivo"),
                    k_inicial=20,
                    k_final=5,
                    modelo_nome=modelo,
                )

                duracao = round(
                    time.perf_counter() - inicio,
                    2,
                )

                resposta = resultado["resposta"]

                print("Tempo:", duracao, "segundos")
                print("Resposta:", resposta[:400])

                resultados.append({
                    "modelo": modelo,
                    "id": item["id"],
                    "pergunta": item["pergunta"],
                    "resposta": resposta,
                    "fontes": json.dumps(
                        resultado["fontes"],
                        ensure_ascii=False,
                    ),
                    "tempo_segundos": duracao,
                    "temperature": 0,
                    "top_p": 0.9,
                    "num_predict": 512,
                    "k_inicial": 20,
                    "k_final": 5,
                    "faithfulness": "",
                    "answer_relevancy": "",
                    "observacoes": "",
                })

            except Exception as erro:
                print(
                    "ERRO:",
                    type(erro).__name__,
                    str(erro),
                )

                resultados.append({
                    "modelo": modelo,
                    "id": item["id"],
                    "pergunta": item["pergunta"],
                    "resposta": "",
                    "fontes": "[]",
                    "tempo_segundos": "",
                    "temperature": 0,
                    "top_p": 0.9,
                    "num_predict": 512,
                    "k_inicial": 20,
                    "k_final": 5,
                    "faithfulness": "",
                    "answer_relevancy": "",
                    "observacoes": (
                        f"Falha: {type(erro).__name__}"
                    ),
                })

    destino = EVALS / "comparacao_modelos.csv"

    with destino.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as arquivo:
        writer = csv.DictWriter(
            arquivo,
            fieldnames=resultados[0].keys(),
        )
        writer.writeheader()
        writer.writerows(resultados)

    print("\n" + "=" * 55)
    print("COMPARAÇÃO FINALIZADA!")
    print("Arquivo:", destino)


if __name__ == "__main__":
    main()
