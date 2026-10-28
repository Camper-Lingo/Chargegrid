
from pathlib import Path
import chromadb

from rag.embeddings import criar_embeddings


# Caminho absoluto relativo ao repositório
ROOT = Path(__file__).resolve().parents[2]

CHROMA_PATH = ROOT / "data" / "chroma_db"

NOME_COLECAO = "goodwe_chargegrid_512"


def criar_colecao():
    """
    Inicializa ChromaDB persistente e recupera
    ou cria a coleção da GoodWe.
    """
    CHROMA_PATH.mkdir(
        parents=True,
        exist_ok=True
    )

    client = chromadb.PersistentClient(
        path=str(CHROMA_PATH)
    )

    colecao = client.get_or_create_collection(
        name=NOME_COLECAO
    )

    return colecao


def indexar_documentos(
    chunks,
    batch_size: int = 16
):
    """
    Gera embeddings e armazena os chunks
    no ChromaDB, em pequenos lotes.
    """
    colecao = criar_colecao()
    embeddings = criar_embeddings()

    total = len(chunks)

    for inicio in range(0, total, batch_size):
        lote = chunks[
            inicio:inicio + batch_size
        ]

        textos = [
            doc.page_content
            for doc in lote
        ]

        ids = [
            doc.metadata["chunk_id"]
            for doc in lote
        ]

        metadados = []

        for doc in lote:
            meta = {
                "arquivo": doc.metadata.get(
                    "arquivo", "desconhecido"
                ),
                "categoria": doc.metadata.get(
                    "categoria", "goodwe"
                ),
                "chunk_size": int(
                    doc.metadata["chunk_size"]
                ),
                "pagina": int(
                    doc.metadata.get("page", -1)
                ),
            }

            metadados.append(meta)

        vetores = embeddings.embed_documents(
            textos
        )

        colecao.upsert(
            ids=ids,
            documents=textos,
            embeddings=vetores,
            metadatas=metadados
        )

        print(
            f"Indexados: "
            f"{min(inicio + batch_size, total)}"
            f"/{total}"
        )

    return colecao
