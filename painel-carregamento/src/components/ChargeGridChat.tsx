
import { useState, type FormEvent } from "react";

type Fonte = {
  id: string;
  arquivo: string;
  pagina: string;
};

type Mensagem = {
  papel: "usuario" | "assistente";
  texto: string;
  fontes?: Fonte[];
};

const API_URL =
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export default function ChargeGridChat() {
  const [aberto, setAberto] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      papel: "assistente",
      texto:
        "Olá! Sou o ChargeGrid AI. Posso responder perguntas sobre os carregadores GoodWe com base nos manuais técnicos.",
    },
  ]);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const texto = pergunta.trim();
    if (!texto || carregando) return;

    setMensagens((atual) => [
      ...atual,
      { papel: "usuario", texto },
    ]);
    setPergunta("");
    setCarregando(true);

    try {
      const resposta = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pergunta: texto }),
      });

      if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status}`);
      }

      const dados = await resposta.json();

      setMensagens((atual) => [
        ...atual,
        {
          papel: "assistente",
          texto:
            typeof dados.resposta === "string"
              ? dados.resposta
              : "Não consegui gerar uma resposta.",
          fontes: Array.isArray(dados.fontes)
            ? dados.fontes
            : [],
        },
      ]);
    } catch (erro) {
      console.error("Erro ChargeGrid AI:", erro);

      setMensagens((atual) => [
        ...atual,
        {
          papel: "assistente",
          texto:
            "Não consegui me conectar ao assistente. Verifique se o backend está ligado.",
        },
      ]);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        fontFamily: "Arial, sans-serif",
      }}
    >
      {aberto && (
        <section
          role="dialog"
          aria-label="Chatbot ChargeGrid AI"
          style={{
            width: "min(380px, calc(100vw - 32px))",
            height: "min(540px, calc(100vh - 110px))",
            background: "#ffffff",
            color: "#17252a",
            borderRadius: 18,
            boxShadow: "0 12px 40px rgba(0,0,0,0.24)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          <header
            style={{
              background: "#12352e",
              color: "#ffffff",
              padding: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong>⚡ ChargeGrid AI</strong>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Assistente GoodWe • RAG
              </div>
            </div>

            <button
              onClick={() => setAberto(false)}
              aria-label="Fechar chatbot"
              style={{
                background: "transparent",
                color: "white",
                border: 0,
                cursor: "pointer",
                fontSize: 22,
              }}
            >
              ×
            </button>
          </header>

          <div
            aria-live="polite"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {mensagens.map((mensagem, i) => (
              <div
                key={i}
                style={{
                  alignSelf:
                    mensagem.papel === "usuario"
                      ? "flex-end"
                      : "flex-start",
                  background:
                    mensagem.papel === "usuario"
                      ? "#d4f6df"
                      : "#f0f3f4",
                  borderRadius: 12,
                  padding: 12,
                  maxWidth: "95%",
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {mensagem.texto}

                {!!mensagem.fontes?.length && (
                  <details style={{ marginTop: 10 }}>
                    <summary style={{ cursor: "pointer" }}>
                      Fontes consultadas ({mensagem.fontes.length})
                    </summary>

                    {mensagem.fontes.map((fonte, j) => (
                      <div
                        key={j}
                        style={{
                          marginTop: 7,
                          fontSize: 11,
                          borderTop: "1px solid #ccc",
                          paddingTop: 5,
                        }}
                      >
                        [{fonte.id}] {fonte.arquivo}
                        <br />
                        Página {fonte.pagina}
                      </div>
                    ))}
                  </details>
                )}
              </div>
            ))}

            {carregando && (
              <div style={{ fontSize: 13, color: "#667" }}>
                Consultando os manuais GoodWe...
              </div>
            )}
          </div>

          <form
            onSubmit={enviar}
            style={{
              display: "flex",
              gap: 8,
              padding: 12,
              borderTop: "1px solid #ddd",
            }}
          >
            <input
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="Pergunte sobre os carregadores..."
              aria-label="Pergunta para o ChargeGrid AI"
              maxLength={2000}
              style={{
                flex: 1,
                minWidth: 0,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 13,
              }}
            />

            <button
              type="submit"
              disabled={carregando || pergunta.trim().length < 3}
              style={{
                background: "#16a66a",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                padding: "0 14px",
                cursor: "pointer",
              }}
            >
              Enviar
            </button>
          </form>
        </section>
      )}

      <button
        onClick={() => setAberto((atual) => !atual)}
        aria-label={aberto ? "Fechar ChargeGrid AI" : "Abrir ChargeGrid AI"}
        style={{
          background: "#16a66a",
          color: "#fff",
          border: "none",
          borderRadius: 40,
          padding: "15px 20px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {aberto ? "Fechar" : "⚡ ChargeGrid AI"}
      </button>
    </div>
  );
}
