import { useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  BatteryCharging,
  Bot,
  Clock,
  Flag,
  Info,
  Loader2,
  MapPin,
  Route as RouteIcon,
  Send,
  Wallet,
  Gift,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TripMap from "@/components/trip-map";
import { formatBrl } from "@/lib/charging";
import { askTripAssistant } from "@/lib/trip.functions";
import { runTrip, type TripResult } from "@/lib/trip-core";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/viagem")({
  head: () => ({
    meta: [
      { title: "Planejar viagem — ChargeGrid" },
      {
        name: "description",
        content: "Planeje sua viagem com paradas nos carregadores GoodWe e veja quanto vai gastar.",
      },
    ],
  }),
  component: TripPage,
});

type ChatMessage = { role: "user" | "assistant"; content: string };

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h}h${m ? ` ${m}min` : ""}` : `${m} min`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TripPage() {
  const [trip, setTrip] = useState<TripResult | null>(null);
  const [error, setError] = useState("");

  // Formulário
  const [origin, setOrigin] = useState("São Paulo, SP");
  const [destination, setDestination] = useState("");
  const [battery, setBattery] = useState("80");
  const [departure, setDeparture] = useState("");
  const [planning, setPlanning] = useState(false);

  // IA
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  async function handlePlan(event: FormEvent) {
    event.preventDefault();
    setPlanning(true);
    setError("");
    try {
      // Calcula no próprio navegador (sem servidor): rota, carregadores e custo
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sua sessão expirou. Entre novamente.");
      const result = await runTrip(supabase, auth.user.id, {
        origin,
        destination,
        startBatteryPct: Number(battery) || undefined,
        departure: departure || undefined,
      });
      setTrip(result);
    } catch (err) {
      console.error("Viagem: erro ao planejar", err);
      setError(err instanceof Error ? err.message : "Não foi possível planejar a viagem.");
    } finally {
      setPlanning(false);
    }
  }

  async function handleAsk(event: FormEvent) {
    event.preventDefault();
    const message = question.trim();
    if (!message || asking) return;

    setChat((prev) => [...prev, { role: "user", content: message }]);
    setQuestion("");
    setAsking(true);
    setError("");
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error(
          "Faça login novamente para utilizar o ChargeGrid AI."
        );
      }

const result = await askTripAssistant({
  data: {
    message,
    history: chat,
    accessToken: session.access_token,
  },
});
      setChat((prev) => [...prev, { role: "assistant", content: result.answer }]);
      if (result.trip) setTrip(result.trip);
    } catch (err) {
      console.error("Viagem: erro na IA", err);
      setChat((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Não consegui responder agora. Use o formulário.",
        },
      ]);
    } finally {
      setAsking(false);
    }
  }

  return (
    <AppShell>
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <RouteIcon className="h-6 w-6 text-primary" />
          Planejar viagem
        </h1>
        <p className="mt-1 text-muted-foreground">
          Descubra onde parar nos carregadores GoodWe da estrada e quanto vai gastar.
        </p>
      </div>

      {/* ── IA ─────────────────────────────────────────── */}
      <section className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-center gap-2 font-semibold">
          <Bot className="h-5 w-5 text-primary" />
          Pergunte para a IA
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Ex.: “Vou de São Paulo para Curitiba amanhã às 8h saindo com 70%. Onde paro?”
        </p>

        {chat.length > 0 && (
          <div className="mt-4 flex max-h-80 flex-col gap-2 overflow-y-auto">
            {chat.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "max-w-[85%] self-end rounded-xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground"
                    : "max-w-[90%] self-start whitespace-pre-wrap rounded-xl rounded-bl-sm border border-border bg-card px-3.5 py-2.5 text-sm"
                }
              >
                {m.content}
              </div>
            ))}
            {asking && (
              <div className="flex items-center gap-2 self-start text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Calculando a rota...
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleAsk} className="mt-4 flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Para onde você vai?"
            maxLength={1000}
            disabled={asking}
          />
          <Button type="submit" size="icon" disabled={asking || !question.trim()} aria-label="Enviar">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </section>

      {/* ── Formulário ─────────────────────────────────── */}
      <form onSubmit={handlePlan} className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
        <Field label="Saindo de" icon={<MapPin className="h-4 w-4" />}>
          <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Cidade, UF" required />
        </Field>
        <Field label="Indo para" icon={<Flag className="h-4 w-4" />}>
          <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ex.: Curitiba, PR" required />
        </Field>
        <Field label="Bateria na saída (%)" icon={<BatteryCharging className="h-4 w-4" />}>
          <Input type="number" min={1} max={100} value={battery} onChange={(e) => setBattery(e.target.value)} />
        </Field>
        <Field label="Saída (opcional)" icon={<Clock className="h-4 w-4" />}>
          <Input type="datetime-local" value={departure} onChange={(e) => setDeparture(e.target.value)} />
        </Field>
        <Button type="submit" disabled={planning} className="sm:col-span-2">
          {planning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RouteIcon className="h-4 w-4" />}
          {planning ? "Calculando..." : "Calcular viagem"}
        </Button>
      </form>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {trip && <TripResultView trip={trip} />}
    </AppShell>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  );
}

function TripResultView({ trip }: { trip: TripResult }) {
  const { plan } = trip;

  return (
    <section className="mt-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold">
          {trip.origin.name} → {trip.destination.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          {trip.vehicle.model} · consumo {trip.vehicle.consumptionKwh100km} kWh/100 km · autonomia útil ~{plan.rangeKm} km
        </p>
      </div>

      {!plan.feasible && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {plan.problem} Tente sair com mais bateria ou fale com a Central de Atendimento GoodWe.
          </span>
        </div>
      )}

      {trip.vehicle.consumptionEstimated && (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          O consumo do seu modelo foi estimado pelo tamanho da bateria; os valores são aproximados.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<RouteIcon className="h-4 w-4" />} label="Distância" value={`${Math.round(plan.distanceKm)} km`} />
        <Stat
          icon={<Clock className="h-4 w-4" />}
          label="Tempo total"
          value={formatDuration(plan.totalMinutes)}
          hint={plan.chargingMinutes ? `${formatDuration(plan.chargingMinutes)} carregando` : "sem paradas"}
        />
        <Stat icon={<Wallet className="h-4 w-4" />} label="Custo de recarga" value={formatBrl(plan.chargingCost)} hint={`${plan.energyUsedKwh} kWh na viagem`} />
        <Stat
          icon={<BatteryCharging className="h-4 w-4" />}
          label="Chega com"
          value={plan.feasible ? `${plan.arrivalPct}%` : "—"}
          hint={plan.feasible ? formatTime(plan.arrivalTime) : undefined}
        />
      </div>

      {plan.chargingCost > 0 && <WalletTripInfo tripCost={plan.chargingCost} />}

      <TripMap trip={trip} />
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          {trip.publicChargersUnavailable ? (
            <p className="text-amber-500">
              Não foi possível consultar os eletropostos
              públicos agora. O planejamento GoodWe
              continua disponível.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Encontramos {trip.publicChargers.length} registros
              de eletropostos públicos próximos ao trajeto.

              Os pontos azuis são informativos e ainda não
              entram no cálculo de autonomia, tempo ou custo.
              Confira compatibilidade, acesso e funcionamento
              antes de viajar.
            </p>
          )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <Zap className="h-4 w-4 text-primary" />
          Paradas para recarga
        </h3>

        {plan.stops.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {plan.feasible
              ? `Não precisa parar: você sai com ${plan.startPct}% e chega com ${plan.arrivalPct}%.`
              : "Nenhuma parada possível com os carregadores atuais."}
          </p>
        ) : (
          <ol className="mt-4 space-y-4">
            {plan.stops.map((stop, index) => (
              <li key={stop.charger.id} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{stop.charger.name}</p>
                  {stop.charger.address && (
                    <p className="truncate text-xs text-muted-foreground">{stop.charger.address}</p>
                  )}
                  <p className="mt-1 text-sm">
                    km {Math.round(stop.kmFromStart)} · chega {formatTime(stop.arrivalTime)} ·{" "}
                    <strong>
                      {stop.arrivalPct}% → {stop.departurePct}%
                    </strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {stop.energyKwh} kWh · {stop.chargeMinutes} min · {stop.tariffLabel} ({formatBrl(stop.pricePerKwh)}/kWh) ·{" "}
                    <span className="text-foreground">{formatBrl(stop.cost)}</span>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Margem de segurança: nunca abaixo de {plan.settings.reservePct}% · carga até {plan.settings.targetPct}% por
          parada · {plan.chargersOnRoute} carregador(es) GoodWe perto da rota.
        </p>
      </div>
    </section>
  );
}

// ── Carteira: GridBack estimado e se o saldo cobre a viagem ─────────
// Usa a mesma API da tela Carteira. Se a API Python não estiver no ar
// (ou o cliente não participar do programa), o bloco simplesmente não aparece.

const WALLET_API = "http://localhost:8000";

type WalletSummary = {
  loyalty_member: boolean;
  balance: { total: number };
  tier: { name: string; cashback_pct: number };
};

function WalletTripInfo({ tripCost }: { tripCost: number }) {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("auth_user_id", auth.user.id)
          .maybeSingle();
        if (!customer) return;
        const response = await fetch(`${WALLET_API}/api/wallet/${customer.id}`);
        if (!response.ok) return;
        const result = (await response.json()) as WalletSummary;
        if (active) setWallet(result);
      } catch {
        // API fora do ar: não mostra nada
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!wallet?.loyalty_member) return null;

  const gridback = Math.round(tripCost * wallet.tier.cashback_pct) / 100;
  const balance = Number(wallet.balance.total) || 0;
  const covers = balance >= tripCost;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm text-muted-foreground">GridBack estimado nesta viagem</p>
          <p className="text-lg font-bold">{formatBrl(gridback)}</p>
          <p className="text-xs text-muted-foreground">
            Nível {wallet.tier.name} · {wallet.tier.cashback_pct}% de volta na Carteira
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
        <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Saldo na Carteira</p>
          <p className="text-lg font-bold">{formatBrl(balance)}</p>
          <p className={covers ? "text-xs text-green-500" : "text-xs text-muted-foreground"}>
            {covers ? (
              "Cobre todas as recargas da viagem"
            ) : (
              <>
                Faltam {formatBrl(tripCost - balance)} para cobrir a viagem ·{" "}
                <Link to="/carteira" className="text-primary underline">
                  adicionar créditos
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string | undefined }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-xl font-bold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
