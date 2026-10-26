import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BatteryCharging,
  CalendarDays,
  History,
  Clock,
  Zap,
  CheckCircle2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { formatBrl } from "@/lib/charging";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de recargas — ChargeGrid" },
      {
        name: "description",
        content:
          "Consulte energia, tarifas e valores das suas recargas anteriores.",
      },
      {
        property: "og:title",
        content: "Histórico de recargas — ChargeGrid",
      },
      {
        property: "og:description",
        content: "Seu histórico de recargas no ChargeGrid.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

interface ChargeSession {
  id: number;
  customer_id: number;
  vehicle_id: number;
  station_id: number;

  start_battery_pct: number;
  end_battery_pct: number;

  energy_used_kwh: number;
  cost_per_kwh: number;
  total_cost: number;

  started_at: string;
  ended_at: string;

  duration_minutes: number;
  status: string;
}

function HistoryPage() {
  const {
  data: sessions = [],
  isLoading,
  isError,
  error,
} = useQuery({
  queryKey: ["charge-sessions"],

  queryFn: async () => {
    console.log("BUSCANDO HISTÓRICO DO USUÁRIO");

    // 1. Descobre quem está logado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!user) {
      throw new Error("Usuário não autenticado.");
    }

    // 2. Descobre o customer_id desse usuário
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (customerError) {
      console.error("Erro ao buscar cliente:", customerError);
      throw customerError;
    }

    if (!customer) {
      throw new Error("Cliente não encontrado.");
    }

    console.log("CUSTOMER ID:", customer.id);

    // 3. Busca SOMENTE as sessões desse cliente
    const { data, error } = await supabase
  .from("charge_sessions")
  .select("*")
  .eq("customer_id", customer.id)
  .eq("status", "completed")
  .order("started_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar histórico:", error);
      throw error;
    }

    return (data ?? []) as ChargeSession[];
  },
});

  const totalKwh = sessions.reduce(
    (sum, session) =>
      sum + Number(session.energy_used_kwh ?? 0),
    0
  );

  const totalCost = sessions.reduce(
    (sum, session) =>
      sum + Number(session.total_cost ?? 0),
    0
  );
  const sortedSessions: ChargeSession[] = [...sessions].sort(
  (a: ChargeSession, b: ChargeSession) => {
    return (
      new Date(b.started_at).getTime() -
      new Date(a.started_at).getTime()
    );
  }
);

  return (
    <AppShell>
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">
          Histórico
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Todas as suas recargas em um só lugar.
        </p>
      </div>

      {/* RESUMO */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

        {/* ENERGIA */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />

            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Energia total
            </p>
          </div>

          <p className="mt-3 text-2xl font-bold">
            {totalKwh.toFixed(1)} kWh
          </p>
        </div>

        {/* VALOR */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <BatteryCharging className="h-4 w-4 text-primary" />

            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Valor total
            </p>
          </div>

          <p className="mt-3 text-2xl font-bold text-primary">
            {formatBrl(totalCost)}
          </p>
        </div>

        {/* RECARGAS */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />

            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Recargas
            </p>
          </div>

          <p className="mt-3 text-2xl font-bold">
            {sessions.length}
          </p>
        </div>
      </div>

      {/* CARREGANDO */}
      {isLoading && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-10 text-center">
          <BatteryCharging className="mx-auto h-10 w-10 animate-pulse text-primary" />

          <p className="mt-4 text-sm text-muted-foreground">
            Carregando histórico...
          </p>
        </div>
      )}

      {/* ERRO */}
      {isError && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
          <p className="font-semibold text-red-500">
            Não foi possível carregar o histórico.
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "Erro desconhecido."}
          </p>
        </div>
      )}

      {/* HISTÓRICO */}
      {!isLoading && !isError && (
        <div className="mt-6 space-y-3">

          {/* SEM RECARGAS */}
          {sessions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <History className="mx-auto h-10 w-10 text-muted-foreground" />

              <h2 className="mt-4 font-semibold">
                Nenhuma recarga ainda
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Suas recargas aparecerão aqui depois de um
                carregamento.
              </p>
            </div>
          )}

          {/* SESSÕES */}
          {sortedSessions.map((session) => {
            const startBattery = Number(
              session.start_battery_pct ?? 0
            );

            const endBattery = Number(
              session.end_battery_pct ?? 0
            );

            const energy = Number(
              session.energy_used_kwh ?? 0
            );

            const cost = Number(
              session.total_cost ?? 0
            );

            const price = Number(
              session.cost_per_kwh ?? 0
            );

            return (
              <div
                key={session.id}
                className="rounded-xl border border-border bg-card p-5 transition hover:border-primary/30"
              >
                {/* TOPO */}
                <div className="flex items-start justify-between gap-4">

                  <div className="flex items-center gap-4">

                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                      <BatteryCharging className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">

                        <p className="font-semibold">
                          {startBattery}% → {endBattery}%
                        </p>

                        {session.status === "completed" && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}

                      </div>

                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />

                        {new Date(
                          session.started_at
                        ).toLocaleString("pt-BR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* PREÇO */}
                  <div className="text-right">
                    <p className="font-bold text-primary">
                      {formatBrl(cost)}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {formatBrl(price)}/kWh
                    </p>
                  </div>

                </div>

                {/* DETALHES */}
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">

                  <SessionInfo
                    label="Energia"
                    value={`${energy.toFixed(1)} kWh`}
                  />

                  <SessionInfo
                    label="Duração"
                    value={`${session.duration_minutes} min`}
                    icon={<Clock className="h-3 w-3" />}
                  />

                  <SessionInfo
                    label="Estação"
                    value={`#${session.station_id}`}
                  />

                  <SessionInfo
                    label="Status"
                    value={
                      session.status === "completed"
                        ? "Concluído"
                        : session.status
                    }
                  />

                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function SessionInfo({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <div className="mt-1 flex items-center gap-1">
        {icon}

        <p className="text-sm font-semibold">
          {value}
        </p>
      </div>
    </div>
  );
}