
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from rag.pipeline_v2 import responder_v2


router = APIRouter(
    prefix="/api/ai",
    tags=["ChargeGrid AI"],
)


class ChatRequest(BaseModel):
    pergunta: str = Field(
        min_length=3,
        max_length=2000
    )


@router.post("/chat")
async def chat(request: ChatRequest):
    try:
        resultado = await run_in_threadpool(
            responder_v2,
            pergunta=request.pergunta,
        )

        return resultado

    except Exception as erro:
        print(
            f"[ChargeGrid AI] Erro interno: "
            f"{type(erro).__name__}: {erro}"
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "Assistente temporariamente indisponível."
            )
        )
