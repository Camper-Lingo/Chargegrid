
from pathlib import Path

from langchain_community.document_loaders import (
    PyMuPDFLoader,
    TextLoader,
)


def carregar_documentos(
    diretorio: str | Path,
) -> list:
    """
    Carrega documentos reais da base GoodWe.

    Suporta PDF, TXT e Markdown.
    Preserva arquivo, página e categoria.
    """
    pasta = Path(diretorio)

    if not pasta.is_dir():
        raise FileNotFoundError(
            f"Diretório não encontrado: {pasta}"
        )

    documentos = []

    arquivos = sorted(
        caminho
        for caminho in pasta.iterdir()
        if caminho.suffix.lower() in
        {".pdf", ".txt", ".md"}
        and caminho.name.lower() != "fontes.md"
    )

    for caminho in arquivos:
        if caminho.suffix.lower() == ".pdf":
            loader = PyMuPDFLoader(str(caminho))
        else:
            loader = TextLoader(
                str(caminho),
                encoding="utf-8",
            )

        paginas = loader.load()

        for pagina in paginas:
            pagina.metadata.update({
                "arquivo": caminho.name,
                "categoria": "mobilidade_eletrica",
                "tipo": caminho.suffix.lower(),
            })

            if pagina.page_content.strip():
                documentos.append(pagina)

        print(
            f"[OK] {caminho.name}: "
            f"{len(paginas)} unidades carregadas"
        )

    if not documentos:
        raise ValueError(
            "Nenhum documento com texto encontrado. "
            "Adicione arquivos reais em "
            "data/knowledge_base."
        )

    return documentos
