
from dotenv import load_dotenv
from langchain_ollama import ChatOllama

from rag.retriever import buscar
from rag.prompt_rag import (
    PROMPT_VERSION,
    SYSTEM_PROMPT_V1,
)

load_dotenv()


def criar_modelo():
    """Configura o modelo de geração."""
    return ChatOllama(
        model="gemma4:cloud",
        temperature=0,
        base_url="http://127.0.0.1:11434",
    )


def responder(
    pergunta: str,
    arquivo: str | None = None,
    k: int = 5,
) -> dict:
    """
    Executa o pipeline RAG:
    recuperar -> montar contexto -> gerar.
    """

    trechos = buscar(
        consulta=pergunta,
        k=k,
        arquivo=arquivo,
    )

    if not trechos:
        return {
            "resposta": (
                "Não encontrei informações suficientes "
                "na base de conhecimento."
            ),
            "fontes": [],
            "prompt_version": PROMPT_VERSION,
        }

    blocos = []
    fontes = []

    for numero, trecho in enumerate(trechos, 1):
        identificador = f"Fonte {numero}"
        pagina = trecho["pagina"]

        pagina_texto = (
            str(pagina + 1)
            if isinstance(pagina, int) and pagina >= 0
            else "N/D"
        )

        blocos.append(
            f"[{identificador}]\n"
            f"Documento: {trecho['arquivo']}\n"
            f"Página PDF: {pagina_texto}\n"
            f"Trecho ID: {trecho['id']}\n"
            f"Conteúdo:\n{trecho['texto']}"
        )

        fontes.append({
            "id": identificador,
            "arquivo": trecho["arquivo"],
            "pagina": pagina_texto,
            "chunk_id": trecho["id"],
        })

    contexto = "\n\n---\n\n".join(blocos)

    modelo = criar_modelo()

    resposta_llm = modelo.invoke([
        ("system", SYSTEM_PROMPT_V1),
        (
            "human",
            f"<documentos>\n{contexto}\n</documentos>\n\n"
            f"<pergunta>\n{pergunta}\n</pergunta>"
        ),
    ])

    return {
        "resposta": resposta_llm.content,
        "fontes": fontes,
        "prompt_version": PROMPT_VERSION,
    }
