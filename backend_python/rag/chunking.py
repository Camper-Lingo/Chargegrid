
from langchain_text_splitters import (
    RecursiveCharacterTextSplitter,
)


def dividir_documentos(
    documentos: list,
    chunk_size: int = 512,
    chunk_overlap: int | None = None,
) -> list:
    """
    Divide documentos em chunks.

    Usa overlap de aproximadamente 12,5%
    quando não informado.
    """
    if chunk_size <= 0:
        raise ValueError(
            "chunk_size deve ser positivo."
        )

    if chunk_overlap is None:
        chunk_overlap = chunk_size // 8

    if not 0 <= chunk_overlap < chunk_size:
        raise ValueError(
            "chunk_overlap deve ser menor "
            "que chunk_size."
        )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=[
            "\n\n",
            "\n",
            ". ",
            " ",
            "",
        ],
    )

    chunks = splitter.split_documents(documentos)

    for indice, chunk in enumerate(chunks):
        chunk.metadata["chunk_id"] = (
            f"{chunk_size}_{indice}"
        )
        chunk.metadata["chunk_size"] = chunk_size

    return chunks
