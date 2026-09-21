import { createFileRoute, Link } from "@tanstack/react-router";
import { BatteryCharging, Zap, Clock, Wallet, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChargeGrid — Recarga inteligente de veículos elétricos" },
      {
        name: "description",
        content:
          "Escolha quanto quer carregar (+10%, +20%, +30%...), veja os kWh necessários e o preço antes de iniciar. Tarifa por horário, sem surpresas.",
      },
      { property: "og:title", content: "ChargeGrid — Recarga inteligente de veículos elétricos" },
      {
        property: "og:description",
        content:
          "Escolha quanto quer carregar e saiba exatamente quanto vai pagar antes de iniciar a recarga.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const steps = [
  {
    icon: BatteryCharging,
    title: "Quanto você quer carregar?",
    text: "Toque em +10%, +20%, +30%, +40% ou 100% — ou digite um valor personalizado.",
  },
  {
    icon: Zap,
    title: "Veja a energia necessária",
    text: "O sistema calcula os kWh com base na capacidade da sua bateria. 60 kWh × 30% = 18 kWh.",
  },
  {
    icon: Wallet,
    title: "Saiba o preço antes",
    text: "A energia é calculada pela tarifa vigente naquele horário. Você vê o valor antes de iniciar.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight">ChargeGrid</span>
        </div>
        <Link
          to="/auth"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Entrar
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="py-20 text-center">
          <p className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-medium text-secondary-foreground">
            <Clock className="h-3.5 w-3.5" />
            Tarifa inteligente por horário
          </p>
          <h1 className="mx-auto max-w-2xl text-4xl font-bold leading-tight tracking-tight text-glow sm:text-6xl">
            Carregue só o que você precisa.{" "}
            <span className="text-primary">Pague só o que você vê.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Em vez de simplesmente iniciar uma recarga, escolha quanto deseja adicionar à bateria e
            veja energia, tempo e custo — antes de começar.
          </p>
          <div className="mt-10">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-4 text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 card-glow"
            >
              Começar agora
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-24 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.title} className="rounded-xl border border-border bg-card p-6">
              <s.icon className="h-8 w-8 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </section>

        <section className="pb-24">
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 card-glow">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Exemplo real
            </p>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
              <span className="flex items-center gap-2 font-semibold text-secondary-foreground">
                <Zap className="h-4 w-4" /> +30%
              </span>
              <span className="text-sm text-muted-foreground">18 kWh necessários</span>
            </div>
            <div className="mt-3 flex items-center justify-between px-1">
              <span className="text-sm text-muted-foreground">60 kWh × 30%</span>
              <span className="text-2xl font-bold text-primary">R$ 14,40</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        ChargeGrid — recarga inteligente, sem surpresas na conta.
      </footer>
    </div>
  );
}
