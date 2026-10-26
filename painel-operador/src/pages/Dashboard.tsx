import { useEffect, useState } from "react";

import {
  Activity,
  BatteryCharging,
  DollarSign,
  Users,
  Zap,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getDashboard } from "../services/api";
import type { DashboardData } from "../types";

type Period = "today" | "7d" | "30d";

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("today");

  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();

    const interval = setInterval(() => {
      loadDashboard(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [period]);

  async function loadDashboard(
    showLoading = true
  ) {
    try {
      if (showLoading) {
        setLoading(true);
      }

      setError("");

      const result = await getDashboard(period);

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar dashboard"
      );
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  if (loading && !data) {
    return (
      <div className="dashboard-loading">
        <Zap className="loading-icon" />
        Carregando Centro de Operações...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="dashboard-error">
        <strong>Não foi possível carregar o dashboard.</strong>
        <span>{error}</span>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const available =
    data.station_status.available ?? 0;

  const occupied =
    data.station_status.occupied ?? 0;

  const offline =
    data.station_status.offline ?? 0;

  const totalStations =
    available + occupied + offline;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Visão Geral</h1>

          <p>
            Monitoramento da rede ChargeGrid em tempo real.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <div className="period-selector">
            <button
              className={period === "today" ? "selected" : ""}
              onClick={() => setPeriod("today")}
            >
              Hoje
            </button>

            <button
              className={period === "7d" ? "selected" : ""}
              onClick={() => setPeriod("7d")}
            >
              7 dias
            </button>

            <button
              className={period === "30d" ? "selected" : ""}
              onClick={() => setPeriod("30d")}
            >
              30 dias
            </button>
          </div>

          <span className="live-badge">
            ● Ao vivo
          </span>
        </div>
      </div>

      <section className="kpi-grid">

        <KpiCard
          title="Sessões"
          value={data.kpis.sessions.value.toFixed(0)}
          change={data.kpis.sessions.change_pct}
          icon={<BatteryCharging size={19} />}
        />

        <KpiCard
          title="Energia"
          value={`${data.kpis.energy_kwh.value.toFixed(1)} kWh`}
          change={data.kpis.energy_kwh.change_pct}
          icon={<Zap size={19} />}
        />

        <KpiCard
          title="Receita"
          value={formatMoney(data.kpis.revenue.value)}
          change={data.kpis.revenue.change_pct}
          icon={<DollarSign size={19} />}
        />

        <KpiCard
          title="Usuários ativos"
          value={data.kpis.active_users.value.toFixed(0)}
          change={data.kpis.active_users.change_pct}
          icon={<Users size={19} />}
        />

      </section>

      <section className="dashboard-grid">

        <div className="dashboard-card chart-card">

          <div className="card-heading">
            <div>
              <h2>Atividade da rede</h2>
              <p>Sessões realizadas no período</p>
            </div>

            <Activity size={19} />
          </div>

          <div className="chart-container">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <AreaChart data={data.series}>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1c252f"
                />

                <XAxis
                  dataKey="label"
                  stroke="#65717e"
                  fontSize={11}
                />

                <YAxis
                  stroke="#65717e"
                  fontSize={11}
                  allowDecimals={false}
                />

                <Tooltip
                  contentStyle={{
                    background: "#0d1218",
                    border: "1px solid #26313d",
                    borderRadius: "8px",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="sessions"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.12}
                />

              </AreaChart>
            </ResponsiveContainer>
          </div>

        </div>

        <div className="dashboard-card">

          <div className="card-heading">
            <div>
              <h2>Estações</h2>
              <p>{totalStations} na rede</p>
            </div>

            <Zap size={19} />
          </div>

          <div className="station-status-list">

            <StatusRow
              label="Disponíveis"
              value={available}
              type="available"
            />

            <StatusRow
              label="Ocupadas"
              value={occupied}
              type="occupied"
            />

            <StatusRow
              label="Offline"
              value={offline}
              type="offline"
            />

          </div>

        </div>

      </section>

      <section className="dashboard-grid secondary">

        <div className="dashboard-card">

          <div className="card-heading">
            <div>
              <h2>Operação</h2>
              <p>Indicadores operacionais</p>
            </div>

            <Activity size={19} />
          </div>

          <div className="operation-grid">

            <div>
              <span>Horário de pico</span>
              <strong>
                {data.peak_hour !== null
                  ? `${data.peak_hour}h`
                  : "--"}
              </strong>
            </div>

            <div>
              <span>Duração média</span>
              <strong>
                {data.kpis.avg_duration_min.value.toFixed(0)} min
              </strong>
            </div>

            <div>
              <span>Canceladas</span>
              <strong>
                {data.kpis.cancelled.value.toFixed(0)}
              </strong>
            </div>

            <div>
              <span>Atualização</span>
              <strong className="online-text">
                Ao vivo
              </strong>
            </div>

          </div>

        </div>

        <div className="dashboard-card">

          <div className="card-heading">
            <div>
              <h2>Estações mais utilizadas</h2>
              <p>Ranking do período</p>
            </div>

            <BatteryCharging size={19} />
          </div>

          {data.by_station.length === 0 ? (
            <div className="empty-dashboard">
              Ainda não há sessões neste período.
            </div>
          ) : (
            <div className="station-ranking">

              {data.by_station.map(
                (station, index) => (
                  <div
                    className="ranking-row"
                    key={station.station_code}
                  >
                    <span className="ranking-number">
                      {index + 1}
                    </span>

                    <div>
                      <strong>
                        {station.station_code}
                      </strong>

                      <small>
                        {station.energy_kwh.toFixed(1)} kWh
                      </small>
                    </div>

                    <span className="ranking-sessions">
                      {station.sessions} sessões
                    </span>
                  </div>
                )
              )}

            </div>
          )}

        </div>

      </section>
    </>
  );
}

function KpiCard({
  title,
  value,
  change,
  icon,
}: {
  title: string;
  value: string;
  change?: number | null;
  icon: React.ReactNode;
}) {
  return (
    <div className="kpi-card">

      <div className="kpi-top">
        <span>{title}</span>

        <div className="kpi-icon">
          {icon}
        </div>
      </div>

      <strong>{value}</strong>

      <div className="kpi-change">
        {change === null ||
        change === undefined ? (
          <span className="neutral-change">
            Sem comparação
          </span>
        ) : (
          <span
            className={
              change >= 0
                ? "positive-change"
                : "negative-change"
            }
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
        )}
      </div>

    </div>
  );
}

function StatusRow({
  label,
  value,
  type,
}: {
  label: string;
  value: number;
  type: "available" | "occupied" | "offline";
}) {
  return (
    <div className="status-row">

      <div>
        <span className={`station-dot ${type}`} />
        {label}
      </div>

      <strong>{value}</strong>

    </div>
  );
}