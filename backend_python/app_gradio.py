
import gradio as gr

from rag.pipeline_v2 import responder_v2


def conversar(mensagem, historico):
    if not mensagem.strip():
        return "Digite uma pergunta."

    try:
        resultado = responder_v2(
            pergunta=mensagem,
            k_inicial=20,
            k_final=5,
        )

        resposta = resultado["resposta"]

        fontes = resultado.get("fontes", [])

        if fontes:
            resposta += "\n\n---\n\n### Fontes consultadas\n"

            for fonte in fontes:
                resposta += (
                    f"\n- **{fonte['id']}**: "
                    f"{fonte['arquivo']} "
                    f"(página {fonte['pagina']})"
                )

        return resposta

    except Exception as erro:
        print(
            "Erro interno no chatbot:",
            type(erro).__name__,
            str(erro),
        )
        return (
            "O assistente está indisponível no momento. "
            "Verifique se o Ollama está funcionando."
        )


app = gr.ChatInterface(
    fn=conversar,
    title="⚡ ChargeGrid AI",
    description=(
        "Assistente de mobilidade elétrica com RAG. "
        "Consulte os manuais técnicos oficiais GoodWe."
    ),
    examples=[
        "Quais são as potências dos modelos GoodWe HCA G2?",
        "Quais cuidados de segurança são necessários para utilizar o HCA?",
        "Quais funções inteligentes o HCA G2 possui?",
    ],
)

if __name__ == "__main__":
    app.launch(
        server_name="127.0.0.1",
        server_port=7860,
        share=False,
    )
