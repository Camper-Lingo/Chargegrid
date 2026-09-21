import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Battery, Car, Wallet, ChevronRight, Clock, MapPin, CircleDollarSign, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import {
  activeTariff,
  formatBrl,
  type ChargingSession,
  type TariffPeriod,
  type Vehicle,
} from "@/lib/charging";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [
    { title: "Painel — ChargeGrid" },
    { name: "description", content: "Acompanhe a bateria, a tarifa atual e seus gastos com recarga." },
    { property: "og:title", content: "Painel — ChargeGrid" },
    { property: "og:description", content: "Acompanhe seu veículo e suas recargas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Dashboard,
});

function Dashboard() {
  const [currentBattery, setCurrentBattery] = useState("");
  const [targetBattery, setTargetBattery] = useState("80");
  const { data: connectionCode } = useQuery({
  queryKey: ["connection-code"],
  queryFn: async () => {
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return null;
    }

    const { data: customer, error } = await supabase
      .from("customers")
      .select("connection_code")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar código de conexão:", error);
      return null;
    }

    return customer?.connection_code ?? null;
  },
});
  const { data: vehicle } = useQuery({
  queryKey: ["vehicle"],
  queryFn: async () => {
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      return null;
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle();

    if (customerError || !customer) {
      console.error("Erro ao buscar customer:", customerError);
      return null;
    }

    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("customer_id", customer.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar veículo:", error);
      return null;
    }

    return (data as Vehicle | null) ?? null;
  },
});

  const { data: tariffs } = useQuery({
    queryKey: ["tariffs"],
    queryFn: async () => {
      const { data } = await supabase.from("tariff_periods").select("*").order("starts_at");
      return (data ?? []) as TariffPeriod[];
    },
  });

  const { data: sessions } = useQuery({
  queryKey: ["sessions"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("charge_sessions")
      .select("*")
      .eq("status", "completed")
      .order("started_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar sessões:", error);
      return [];
    }

    return data ?? [];
  },
});

  const now = new Date();
  const tariff = tariffs ? activeTariff(tariffs, now) : null;
  const batteryCapacity = vehicle
  ? Number(vehicle.battery_capacity_kwh)
  : 0;

const currentBatteryValue = Number(currentBattery) || 0;
const targetBatteryValue = Number(targetBattery) || 0;

const batteryPercentageToAdd = Math.max(
  0,
  Math.min(100, targetBatteryValue) -
    Math.min(100, currentBatteryValue)
);

const energyNeeded =
  batteryCapacity * (batteryPercentageToAdd / 100);

const estimatedCost = tariff
  ? energyNeeded * Number(tariff.price_per_kwh)
  : 0;
  const chargingPower = Number(vehicle?.max_charge_power_kw) || 0;

const estimatedMinutes =
  chargingPower > 0
    ? (energyNeeded / chargingPower) * 60
    : 0;
  const monthSessions = (sessions ?? []).filter((s) => {
  const d = new Date(s.started_at);

  return (
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
});
  const monthKwh = monthSessions.reduce((sum, s) => sum + Number(s.energy_used_kwh), 0);
  const monthCost = monthSessions.reduce((sum, s) => sum + Number(s.total_cost), 0);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold tracking-tight">Olá! Este é o resumo do seu carro</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Aqui você entende quanto custa carregar e acompanha seus gastos sem complicação.
      </p>

      {!vehicle ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Car className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Cadastre seu veículo</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Informe a capacidade da bateria e a potência de carregamento para ver quanto custa cada
            recarga antes de iniciar.
          </p>
          <Link
            to="/veiculo"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            Cadastrar veículo
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Battery className="h-4 w-4 text-primary" />
                Qual é meu carro?
              </div>
              <p className="mt-3 truncate text-xl font-bold text-primary">
                {vehicle.model}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">A bateria comporta {Number(vehicle.battery_capacity_kwh)} kWh. Ele recebe até {Number(vehicle.max_charge_power_kw)} kW de potência.</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
    <Clock className="h-4 w-4 text-primary" />
    Quanto custa carregar?
  </div>

  {tariff ? (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="current-battery"
            className="text-xs text-muted-foreground"
          >
            Bateria atual (%)
          </label>

          <input
            id="current-battery"
            type="number"
            min="0"
            max="100"
            value={currentBattery}
            onChange={(e) => setCurrentBattery(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="target-battery"
            className="text-xs text-muted-foreground"
          >
            Carregar até (%)
          </label>

          <input
            id="target-battery"
            type="number"
            min="0"
            max="100"
            value={targetBattery}
            onChange={(e) => {
              const value = e.target.value;
              if(value === "") {
                setTargetBattery("");
                return;
              }
              const number = Math.min(100, Number(value));
              setTargetBattery(String(number));
            }}

            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Tarifa atual
          </span>

          <strong>
            {formatBrl(Number(tariff.price_per_kwh))}/kWh
          </strong>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Energia necessária
          </span>

          <strong>
            {energyNeeded.toFixed(2)} kWh
          </strong>
        </div>
        <div className="flex justify-between text-sm">
  <span className="text-muted-foreground">
    Tempo estimado
  </span>
  <strong>
    {estimatedMinutes < 1
      ? "Menos de 1 min"
      : `${Math.floor(estimatedMinutes / 60)}h ${Math.round(
          estimatedMinutes % 60
        )}min`}
  </strong>
</div>

        <div className="flex justify-between items-end pt-2 border-t border-border">
          <span className="text-sm text-muted-foreground">
            Custo estimado
          </span>

          <strong className="text-2xl text-primary">
            {formatBrl(estimatedCost)}
          </strong>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {tariff.label} · vigente até {tariff.ends_at.slice(0, 5)}
      </p>
    </>
  ) : (
    <p className="mt-4 text-sm text-muted-foreground">
      Não há tarifa configurada para este horário.
    </p>
  )}
</div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Wallet className="h-4 w-4 text-primary" />
                Quanto gastei no mês?
              </div>
              <p className="mt-3 text-4xl font-bold">{formatBrl(monthCost)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {monthKwh.toFixed(1)} kWh em {monthSessions.length}{" "}
                {monthSessions.length === 1 ? "recarga" : "recargas"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <CircleDollarSign className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p><strong className="text-foreground">Como funciona:</strong> kWh é a quantidade de energia colocada no carro. O preço final é essa quantidade multiplicada pela tarifa do horário.</p>
          </div>

          <div className="mt-6 space-y-3">
  <Link
    to="/eletropostos"
    className="flex items-center justify-between rounded-xl bg-primary p-5 text-primary-foreground transition-colors hover:bg-primary/90"
  >
    <div className="flex items-center gap-3">
      <MapPin className="h-6 w-6" />
      <div>
        <p className="font-bold">Encontrar eletroposto</p>
        <p className="text-sm opacity-80">
          Veja opções perto de você.
        </p>
      </div>
    </div>

    <ChevronRight className="h-5 w-5" />
  </Link>

  <button
    type="button"
    onClick={() => {
      const element = document.getElementById("connection-code");

      element?.classList.toggle("hidden");
    }}
    className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-muted"
  >
    <div className="flex items-center gap-3">
      <KeyRound className="h-6 w-6 text-primary" />

      <div>
        <p className="font-bold">Visualizar código de conexão</p>
        <p className="text-sm text-muted-foreground">
          Use este código para conectar ao painel.
        </p>
      </div>
    </div>

    <ChevronRight className="h-5 w-5 text-muted-foreground" />
  </button>

  <div
    id="connection-code"
    className="hidden rounded-xl border border-primary/20 bg-primary/5 p-6 text-center"
  >
    <p className="text-sm font-medium text-muted-foreground">
      Seu código de conexão
    </p>

    <p className="mt-3 text-3xl font-black tracking-[0.25em] text-primary">
      {connectionCode ?? "Indisponível"}
    </p>

    <p className="mt-3 text-xs text-muted-foreground">
      Use este código no painel ChargeGrid para conectar sua conta.
    </p>
  </div>
</div>
        </>
      )}
    </AppShell>
  );
}
