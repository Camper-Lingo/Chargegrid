
from pathlib import Path

from rag.loader import carregar_documentos
from rag.chunking import dividir_documentos
from rag.vector_store import indexar_documentos


ROOT = Path(__file__).resolve().parent.parent

PASTA_DOCUMENTOS = (
    ROOT / "data" / "knowledge_base"
)


def main():
    print("=" * 50)
    print("CHARGEGRID — INDEXAÇÃO RAG")
    print("=" * 50)

    # 1. Carregar documentos reais
    documentos = carregar_documentos(
        PASTA_DOCUMENTOS
    )

    print(
        "\nUnidades carregadas:",
        len(documentos)
    )

    # 2. Dividir em chunks
    chunks = dividir_documentos(
        documentos,
        chunk_size=512,
        chunk_overlap=64
    )

    print("Chunks gerados:", len(chunks))

    # 3. Vetorizar e salvar no ChromaDB
    colecao = indexar_documentos(
        chunks,
        batch_size=16
    )

    print("\n" + "=" * 50)
    print("INDEXAÇÃO CONCLUÍDA!")
    print("Vetores armazenados:", colecao.count())
    print("=" * 50)


if __name__ == "__main__":
    main()
