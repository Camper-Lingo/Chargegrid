import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BatteryCharging, Bolt, Clock, Gauge, Lightbulb, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  QUICK_OPTIONS,
  STATION_POWER_KW,
  activeTariff,
  bestSavingsTip,
  chargeCost,
  chargeMinutes,
  energyKwh,
  formatBrl,
  formatDuration,
  type TariffPeriod,
  type Vehicle,
} from "@/lib/charging";

export function ChargingFlow({ vehicle, tariffs }: { vehicle: Vehicle; tariffs: TariffPeriod[] }) {
  const queryClient = useQueryClient();
  const [startPct, setStartPct] = useState(Number(vehicle.current_battery_pct));
  const [selected, setSelected] = useState(30);
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const maxAdd = Math.max(0, 100 - startPct);
  const requested = custom ? Number(custom) || 0 : selected === 100 ? maxAdd : selected;
  const addedPct = Math.min(requested, maxAdd);
  const targetPct = Math.min(100, startPct + addedPct);
  const kwh = energyKwh(Number(vehicle.battery_capacity_kwh), addedPct);
  const tariff = activeTariff(tariffs);
  const price = tariff ? chargeCost(kwh, Number(tariff.price_per_kwh)) : 0;
  const minutes = chargeMinutes(kwh, Number(vehicle.max_charge_power_kw), STATION_POWER_KW);
  const tip = bestSavingsTip(tariffs, kwh);

  async function startCharge() {
  if (!tariff || addedPct <= 0) return;

  setSaving(true);

  // 1. Pega o usuário autenticado
  const { data: authData } = await supabase.auth.getUser();

  console.log("USUÁRIO LOGADO:", authData.user?.id);

  if (!authData.user) {
    toast.error("Sua sessão expirou. Entre novamente.");
    setSaving(false);
    return;
  }

  // 2. Encontra o customer relacionado ao usuário autenticado
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (customerError) {
    console.error("Erro ao buscar customer:", customerError);
    toast.error("Não foi possível encontrar seu cadastro.");
    setSaving(false);
    return;
  }

  if (!customer) {
    toast.error("Seu cadastro de cliente não foi encontrado.");
    setSaving(false);
    return;
  }

  // 3. Define início e fim da recarga
  const startedAt = new Date();
  const endedAt = new Date(
    startedAt.getTime() + minutes * 60 * 1000
  );

  // 4. Registra a sessão de recarga
  const { error: sessionError } = await supabase
    .from("charge_sessions")
    .insert({
      customer_id: customer.id,
      vehicle_id: vehicle.id,
      station_id: 1,
      start_battery_pct: startPct,
      end_battery_pct: targetPct,
      energy_used_kwh: Number(kwh.toFixed(3)),
      cost_per_kwh: Number(tariff.price_per_kwh),
      total_cost: Number(price.toFixed(2)),
      duration_minutes: Math.round(minutes),
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      status: "completed",
    });

  if (sessionError) {
    console.error("Erro ao registrar recarga:", sessionError);
    toast.error("Não foi possível registrar a recarga.");
    setSaving(false);
    return;
  }

  // 5. Atualiza a bateria do veículo
  const { error: vehicleError } = await supabase
    .from("vehicles")
    .update({
      current_battery_pct: targetPct,
    })
    .eq("id", vehicle.id);

  if (vehicleError) {
    console.error("Erro ao atualizar veículo:", vehicleError);
    toast.error("Recarga registrada, mas não foi possível atualizar a bateria.");
    setSaving(false);
    return;
  }

  // 6. Atualiza os dados da aplicação
  await queryClient.invalidateQueries({ queryKey: ["vehicle"] });
  await queryClient.invalidateQueries({ queryKey: ["sessions"] });

  setSaving(false);
  setCompleted(true);
}

  if (completed) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-primary card-glow">
          <BatteryCharging className="h-10 w-10" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-glow">Recarga concluída</h1>
        <p className="mt-2 text-muted-foreground">Sua bateria chegou a {targetPct.toFixed(0)}%.</p>
        <div className="mt-8 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Energia adicionada</p><p className="mt-1 text-xl font-bold">{kwh.toFixed(1)} kWh</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Valor da recarga</p><p className="mt-1 text-xl font-bold text-primary">{formatBrl(price)}</p></div>
        </div>
        <Button className="mt-6" onClick={() => { setCompleted(false); setStartPct(targetPct); setSelected(10); }}>Nova recarga</Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <section>
        <p className="text-xs font-medium uppercase tracking-widest text-primary">{vehicle.model}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Quanto você quer carregar?</h1>
        <p className="mt-2 text-sm text-muted-foreground">Escolha quanto deseja adicionar à bateria.</p>

        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Nível atual da bateria</span><strong className="text-primary">{startPct}%</strong></div>
          <Slider className="mt-5" value={[startPct]} min={0} max={99} step={1} onValueChange={(v) => { setStartPct(v[0] ?? 0); setCustom(""); }} />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>0%</span><span>100%</span></div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {QUICK_OPTIONS.map((pct) => (
            <Button key={pct} type="button" variant={!custom && selected === pct ? "default" : "outline"} className="h-14 text-base font-bold" onClick={() => { setSelected(pct); setCustom(""); }}>
              {pct === 100 ? "100%" : `+${pct}%`}
            </Button>
          ))}
        </div>

        <div className="mt-4">
          <label htmlFor="custom" className="mb-2 block text-xs font-medium uppercase tracking-widest text-muted-foreground">Valor personalizado (%)</label>
          <Input id="custom" type="number" min={1} max={maxAdd} placeholder={`Até ${maxAdd}%`} value={custom} onChange={(e) => setCustom(e.target.value)} />
        </div>
      </section>

      <aside className="rounded-2xl border border-border bg-card p-6 card-glow">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Resumo da recarga</p>
        <div className="mt-5 flex items-baseline justify-between"><span className="text-4xl font-bold text-primary text-glow">+{addedPct.toFixed(0)}%</span><span className="text-sm text-muted-foreground">{startPct}% → {targetPct.toFixed(0)}%</span></div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${targetPct}%` }} /></div>

        <div className="mt-6 space-y-4 border-y border-border py-5">
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-muted-foreground"><Bolt className="h-4 w-4" /> Energia necessária</span><strong>{kwh.toFixed(1)} kWh</strong></div>
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" /> Tempo estimado</span><strong>{formatDuration(minutes)}</strong></div>
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-muted-foreground"><Gauge className="h-4 w-4" /> Tarifa atual</span><strong>{tariff ? `${formatBrl(Number(tariff.price_per_kwh))}/kWh` : "—"}</strong></div>
        </div>

        <div className="mt-6 flex items-end justify-between"><span className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4" /> Você vai pagar</span><strong className="text-3xl text-primary">{formatBrl(price)}</strong></div>

        {tip && <div className="mt-5 flex gap-3 rounded-lg bg-secondary p-3 text-sm text-secondary-foreground"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0" /><span>Carregando após {tip.starts_at}, você economiza <strong>{formatBrl(tip.savings)}</strong>.</span></div>}

        <Button className="mt-6 h-12 w-full text-base font-bold" disabled={saving || !tariff || addedPct <= 0} onClick={startCharge}>
          {saving ? <Loader2 className="animate-spin" /> : <BatteryCharging />}
          Iniciar recarga
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">Simulação com estação de {STATION_POWER_KW} kW</p>
      </aside>
    </div>
  );
}
