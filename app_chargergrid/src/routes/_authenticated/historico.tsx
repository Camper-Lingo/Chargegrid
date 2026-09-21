import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BatteryCharging, CalendarDays, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { formatBrl, type ChargingSession } from "@/lib/charging";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [
    { title: "Histórico de recargas — ChargeGrid" },
    { name: "description", content: "Consulte energia, tarifas e valores das suas recargas anteriores." },
    { property: "og:title", content: "Histórico de recargas — ChargeGrid" },
    { property: "og:description", content: "Seu histórico de recargas no ChargeGrid." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data: sessions, isLoading } = useQuery({ queryKey: ["sessions"], queryFn: async () => {
    const { data } = await supabase.from("charge_sessions").select("*").order("created_at", { ascending: false });
    return (data ?? []) as ChargingSession[];
  }});
  const totalKwh = (sessions ?? []).reduce((sum, s) => sum + Number(s.energy_kwh), 0);
  const totalCost = (sessions ?? []).reduce((sum, s) => sum + Number(s.total_cost), 0);

  return <AppShell>
    <h1 className="text-2xl font-bold">Histórico</h1><p className="mt-1 text-sm text-muted-foreground">Todas as suas recargas em um só lugar.</p>
    <div className="mt-6 grid grid-cols-2 gap-4"><div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Energia total</p><p className="mt-2 text-2xl font-bold">{totalKwh.toFixed(1)} kWh</p></div><div className="rounded-xl border border-border bg-card p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Valor total</p><p className="mt-2 text-2xl font-bold text-primary">{formatBrl(totalCost)}</p></div></div>
    <div className="mt-6 space-y-3">
      {!isLoading && sessions?.length === 0 && <div className="rounded-2xl border border-dashed border-border p-10 text-center"><History className="mx-auto h-10 w-10 text-muted-foreground" /><h2 className="mt-4 font-semibold">Nenhuma recarga ainda</h2><p className="mt-1 text-sm text-muted-foreground">Suas recargas concluídas aparecerão aqui.</p></div>}
      {sessions?.map((s) => <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary"><BatteryCharging className="h-5 w-5" /></div><div><p className="font-semibold">+{Number(s.target_pct) - Number(s.start_pct)}% · {Number(s.energy_kwh).toFixed(1)} kWh</p><p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3 w-3" />{new Date(s.created_at).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</p></div></div><div className="text-right"><p className="font-bold text-primary">{formatBrl(Number(s.total_cost))}</p><p className="text-xs text-muted-foreground">{formatBrl(Number(s.price_per_kwh))}/kWh</p></div></div>)}
    </div>
  </AppShell>;
}
