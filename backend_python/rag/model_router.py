
import re


def identificar_familia(pergunta: str) -> str | None:
    """
    Identifica a família do carregador na pergunta.

    Retorna:
    - hca_g2
    - hca
    - None
    """

    texto = pergunta.lower()

    if re.search(
        r"\bhca[\s-]*g2\b|\bgw(?:7|11|22)k-hca-20\b",
        texto,
    ):
        return "hca_g2"

    if re.search(r"\bhca\b", texto):
        return "hca"

    return None


def selecionar_arquivo(
    pergunta: str,
    arquivo: str | None = None,
) -> str | None:
    """
    Usa o filtro explícito se fornecido.
    Caso contrário, seleciona automaticamente
    um documento para perguntas específicas.
    """

    if arquivo is not None:
        return arquivo

    familia = identificar_familia(pergunta)

    # Um único filtro de arquivo é seguro para
    # perguntas diretamente sobre potências.
    pergunta_tecnica = pergunta.lower()

    if (
        familia == "hca_g2"
        and any(
            termo in pergunta_tecnica
            for termo in (
                "potência", "potencia",
                "power", "watt", "kw"
            )
        )
    ):
        return "GW_HCA-G2_Datasheet-EN.pdf"

    # Nas demais perguntas, não restringimos
    # a busca a um único documento.
    return None
