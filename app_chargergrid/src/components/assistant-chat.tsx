import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Check, Copy, Headset, Mail, MessageCircle, MessageCircleQuestion, Phone, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FAQ, answerLocally } from "@/lib/assistant-faq";
import { SUPPORT_CENTER, phoneLink, whatsappLink } from "@/lib/support";

type Message = {
  role: "user" | "assistant";
  content: string;
  handoff?: boolean; // mostra direto os canais da Central GoodWe
};

const WELCOME: Message = {
  role: "assistant",
  content:
    "Oi! Sou o assistente do ChargeGrid. Posso ajudar com recargas, preços, código de conexão, eletropostos e seu veículo. Se a sua dúvida for mais complicada, eu te encaminho para um atendente da Central GoodWe.",
};

export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Sugestões iniciais: as primeiras perguntas da FAQ
  useEffect(() => {
    if (open && !suggestions.length) setSuggestions(FAQ.slice(0, 4).map((item) => item.question));
  }, [open, suggestions.length]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    // Resposta da FAQ (no próprio navegador). O pequeno atraso só deixa a conversa mais natural.
    const result = answerLocally(question);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        // Caso maior: o cartão da Central GoodWe aparece junto, sem precisar clicar
        { role: "assistant", content: result.answer, handoff: result.escalate },
      ]);
      if (result.related.length) setSuggestions(result.related);
      setLoading(false);
    }, 400);
  }

  // Ícone de headset no topo: mostra a central a qualquer momento
  function requestAgent() {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Quero falar com um atendente" },
      {
        role: "assistant",
        content: `Certo! Fale com um atendente da ${SUPPORT_CENTER.name} por um dos canais abaixo.`,
        handoff: true,
      },
    ]);
  }

  // Resumo enviado ao atendente (últimas perguntas do usuário)
  function conversationSummary() {
    const questions = messages
      .filter((m) => m.role === "user" && m.content !== "Quero falar com um atendente")
      .slice(-3)
      .map((m) => `- ${m.content}`)
      .join("\n");
    return `Olá! Vim pelo assistente do app ChargeGrid e preciso de ajuda.${questions ? `\n\nMinhas dúvidas:\n${questions}` : ""}`;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    send(input);
  }

  return (
    <>
      {open && (
        <section
          aria-label="Assistente de dúvidas"
          className="fixed inset-x-3 bottom-20 top-16 z-40 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[580px] sm:w-[390px]"
        >
          <header className="flex items-center gap-3 border-b border-border bg-background px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Assistente ChargeGrid</p>
              <p className="text-xs text-muted-foreground">Tire suas dúvidas sobre recarga</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={requestAgent}
              title="Falar com um atendente"
              aria-label="Falar com um atendente"
            >
              <Headset className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Fechar assistente"
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div ref={listRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn("flex max-w-[88%] flex-col gap-2", message.role === "user" ? "self-end" : "self-start")}
              >
                <div
                  className={cn(
                    "whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                    message.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm border border-border bg-secondary text-secondary-foreground",
                  )}
                >
                  {message.content}
                </div>

                {message.handoff && <HandoffCard summary={conversationSummary()} />}
              </div>
            ))}

            {loading && (
              <div className="flex gap-1 self-start rounded-xl rounded-bl-sm border border-border bg-secondary px-4 py-3">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            )}
          </div>

          {suggestions.length > 0 && !loading && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-3">
              {suggestions.map((question) => (
                <button
                  key={question}
                  onClick={() => send(question)}
                  className="rounded-full border border-border px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-3">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Digite sua dúvida..."
              maxLength={1000}
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Enviar">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </section>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir assistente de dúvidas"
          className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
        >
          <MessageCircleQuestion className="h-5 w-5" />
          <span>Dúvidas?</span>
        </button>
      )}
    </>
  );
}

function HandoffCard({ summary }: { summary: string }) {
  const whatsapp = whatsappLink(summary);
  const phone = phoneLink();
  const email = SUPPORT_CENTER.email;
  const hasChannel = whatsapp || phone || email;
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // sem permissão de área de transferência: o e-mail continua visível na tela
    }
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <Headset className="h-4 w-4 text-primary" />
        {SUPPORT_CENTER.name}
      </div>

      {hasChannel ? (
        <div className="flex flex-col gap-1.5">
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md bg-background px-3 py-2 hover:text-primary">
              <MessageCircle className="h-4 w-4" /> Conversar no WhatsApp
            </a>
          )}
          {phone && (
            <a href={phone} className="flex items-center gap-2 rounded-md bg-background px-3 py-2 hover:text-primary">
              <Phone className="h-4 w-4" /> Ligar: {SUPPORT_CENTER.phone}
            </a>
          )}
          {email && (
            <div className="flex items-center gap-2 rounded-md bg-background px-3 py-2">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 select-all truncate">{email}</span>
              <button
                type="button"
                onClick={copyEmail}
                className="shrink-0 text-xs text-muted-foreground hover:text-primary"
                title="Copiar e-mail"
              >
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground">
          {import.meta.env.DEV
            ? "Contatos da central ainda não configurados — preencha em src/lib/support.ts."
            : "Entre em contato pelos canais oficiais de atendimento da GoodWe."}
        </p>
      )}

      {SUPPORT_CENTER.hours && (
        <p className="mt-2 text-xs text-muted-foreground">Horário: {SUPPORT_CENTER.hours}</p>
      )}
    </div>
  );
}
