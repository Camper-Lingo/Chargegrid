import { useEffect, useState } from "react";
import {
  BrainCircuit,
  Clock3,
  Zap,
  DollarSign,
  RadioTower,
  Lightbulb,
  Activity,
  RefreshCw,
} from "lucide-react";

import {
  getIntelligence,
  type IntelligenceData,
} from "../services/api";

export default function Intelligence() {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadIntelligence();

    const interval = setInterval(() => {
      loadIntelligence(false);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  async function loadIntelligence(showLoading = true) {
    try {
      if (showLoading) {
        setLoading(true);
      }

      setError("");

      const result = await getIntelligence();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar inteligência operacional"
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="dashboard-loading">
        <BrainCircuit className="loading-icon" />
        Analisando dados operacionais...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="dashboard-error">
        <strong>
          Não foi possível carregar os insights.
        </strong>

        <span>{error}</span>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const peakHour =
    data.peak.hour !== null
      ? `${String(data.peak.hour).padStart(2, "0")}:00`
      : "Sem dados";

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Inteligência Operacional</h1>
          <p>
            Análise automática dos dados da rede ChargeGrid.
          </p>
        </div>

        <button
          className="intelligence-refresh"
          onClick={() => loadIntelligence()}
        >
          <RefreshCw size={16} />
          Atualizar análise
        </button>
      </div>

      <section className="intelligence-hero">
        <div className="intelligence-hero-icon">
          <BrainCircuit size={30} />
        </div>

        <div>
          <span>ChargeGrid Intelligence</span>

          <h2>
            Inteligência baseada nos dados operacionais
          </h2>

          <p>
            O sistema analisa sessões e estações para
            identificar padrões de utilização e gerar
            recomendações para a operação.
          </p>
        </div>
      </section>

      <section className="demand-kpi-grid">
        <InsightCard
          title="Horário de pico"
          value={peakHour}
          subtitle={`${data.peak.sessions} sessões`}
          icon={<Clock3 size={20} />}
        />

        <InsightCard
          title="Energia processada"
          value={`${data.summary.total_energy_kwh.toFixed(1)} kWh`}
          subtitle={`${data.summary.completed_sessions} concluídas`}
          icon={<Zap size={20} />}
        />

        <InsightCard
          title="Receita registrada"
          value={`R$ ${data.summary.total_revenue.toFixed(2)}`}
          subtitle="Sessões concluídas"
          icon={<DollarSign size={20} />}
        />

        <InsightCard
          title="Ocupação atual"
          value={`${data.summary.occupancy_pct.toFixed(1)}%`}
          subtitle="Rede de carregadores"
          icon={<Activity size={20} />}
        />
      </section>

      <section className="intelligence-grid">
        <div className="dashboard-card intelligence-station-card">
          <div className="card-heading">
            <div>
              <h2>Estação crítica</h2>
              <p>
                Ponto com maior utilização histórica.
              </p>
            </div>

            <RadioTower size={20} />
          </div>

          {data.critical_station ? (
            <div className="critical-station">
              <div className="critical-station-icon">
                <RadioTower size={28} />
              </div>

              <div>
                <span>Maior utilização</span>

                <strong>
                  {data.critical_station.name}
                </strong>

                <p>
                  {data.critical_station.sessions} sessões
                  registradas
                </p>
              </div>
            </div>
          ) : (
            <div className="intelligence-empty">
              Ainda não existem dados suficientes para
              identificar uma estação crítica.
            </div>
          )}
        </div>

        <div className="dashboard-card">
          <div className="card-heading">
            <div>
              <h2>Resumo da análise</h2>
              <p>Base histórica processada.</p>
            </div>

            <BrainCircuit size={20} />
          </div>

          <div className="intelligence-summary">
            <div>
              <span>Sessões analisadas</span>
              <strong>
                {data.summary.total_sessions}
              </strong>
            </div>

            <div>
              <span>Sessões concluídas</span>
              <strong>
                {data.summary.completed_sessions}
              </strong>
            </div>

            <div>
              <span>Horário de maior movimento</span>
              <strong>{peakHour}</strong>
            </div>

            <div>
              <span>Ocupação atual</span>
              <strong>
                {data.summary.occupancy_pct.toFixed(1)}%
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-card intelligence-recommendations">
        <div className="card-heading">
          <div>
            <h2>Recomendações operacionais</h2>
            <p>
              Insights gerados automaticamente a partir dos
              dados da plataforma.
            </p>
          </div>

          <Lightbulb size={20} />
        </div>

        <div className="recommendation-list">
          {data.recommendations.map(
            (recommendation, index) => (
              <div
                className="recommendation-item"
                key={`${recommendation}-${index}`}
              >
                <div className="recommendation-number">
                  {index + 1}
                </div>

                <p>{recommendation}</p>
              </div>
            )
          )}
        </div>
      </section>
    </>
  );
}

function InsightCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
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

      <small className="intelligence-card-subtitle">
        {subtitle}
      </small>
    </div>
  );
}