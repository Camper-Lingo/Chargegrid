
import csv
import json
from pathlib import Path

from rag.vector_store import criar_colecao

ROOT = Path(__file__).resolve().parent.parent
EVALS = ROOT / "evals"

colecao = criar_colecao()

entrada = EVALS / "avaliacao_v2.csv"
saida = EVALS / "evidencias_v2.md"

with open(entrada, encoding="utf-8-sig", newline="") as f:
    registros = list(csv.DictReader(f))

with open(saida, "w", encoding="utf-8") as f:
    f.write("# Evidências — RAG V2.1\n\n")

    for registro in registros:
        f.write(f"## Questão {registro['id']}\n\n")
        f.write(f"**Pergunta:** {registro['pergunta']}\n\n")
        f.write(f"**Resposta:**\n\n{registro['resposta']}\n\n")

        fontes = json.loads(registro["fontes"])

        for fonte in fontes:
            resultado = colecao.get(
                ids=[fonte["chunk_id"]],
                include=["documents", "metadatas"]
            )

            f.write(f"### {fonte['id']}\n\n")
            f.write(f"Documento: {fonte['arquivo']}\n\n")
            f.write(f"Página: {fonte['pagina']}\n\n")

            if resultado["documents"]:
                f.write("**Trecho recuperado:**\n\n")
                f.write(resultado["documents"][0] + "\n\n")
            else:
                f.write("**Trecho não encontrado no banco.**\n\n")

            f.write("---\n\n")

print("Evidências exportadas!")
print(saida)
