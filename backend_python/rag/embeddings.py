
from langchain_ollama import OllamaEmbeddings


def criar_embeddings():
    """
    Cria o modelo de embeddings da base GoodWe.
    """
    return OllamaEmbeddings(
        model="nomic-embed-text",
        base_url="http://127.0.0.1:11434",
    )
