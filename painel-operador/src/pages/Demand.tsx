import { useEffect,useRef, useState } from "react";


import {
  AlertTriangle,
  Building2,
  Gauge,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { getDemand, updateDemandConfig} from "../services/api";
import type { DemandData } from "../types";

export default function Demand() {
  const [data, setData] = useState<DemandData | null>(null);


  const [installationLimit, setInstallationLimit] = useState("");
  const [buildingConsumption, setBuildingConsumption] = useState("");

  const configEditedRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
  loadDemand();

  const interval = setInterval(() => {
    loadDemand(false);
  }, 5000);

  return () => clearInterval(interval);
}, []);


async function handleSaveConfig() {
  const limit = Number(installationLimit);
  const consumption = Number(buildingConsumption);

  setSaveError("");
  setSaveSuccess("");

  if (
    installationLimit.trim() === "" ||
    buildingConsumption.trim() === "" ||
    !Number.isFinite(limit) ||
    !Number.isFinite(consumption) ||
    limit <= 0 ||
    consumption < 0
  ) {
    setSaveError(
      "Informe um limite maior que zero e um consumo válido."
    );
    return;
  }

  try {
    setSaving(true);

    await updateDemandConfig(limit, consumption);

    // Agora os valores podem voltar a sincronizar
    // com os dados do backend.
    configEditedRef.current = false;

    setSaveSuccess("Configuração salva com sucesso!");

    await loadDemand(false);
  } catch (err) {
    setSaveError(
      err instanceof Error
        ? err.message
        : "Erro ao atualizar configuração"
    );
  } finally {
    setSaving(false);
  }
}

async function loadDemand(showLoading = true) {
  try {
    if (showLoading) {
      setLoading(true);
    }

    const result = await getDemand();

    setError("");
    setData(result);

    // Atualiza os inputs somente se o operador
    // não tiver alterações pendentes.
    if (!configEditedRef.current) {
      setInstallationLimit(
        String(result.installation_limit_kw)
      );

      setBuildingConsumption(
        String(result.building_consumption_kw)
      );
    }
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Erro ao carregar demanda"
    );
  } finally {
    if (showLoading) {
      setLoading(false);
    }
  }
}



  const progress = Math.min(
  Math.max(data?.utilization_pct ?? 0, 0),
  100
);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Gestão de Demanda</h1>

          <p>
            Controle inteligente de potência da instalação.
          </p>
        </div>

        <span
          className={
            data?.limited
              ? "demand-badge limited"
              : "demand-badge normal"
          }
        >
          {!data
            ? "● AGUARDANDO DADOS"
            : data.limited
              ? "● LIMITAÇÃO ATIVA"
              : "● OPERAÇÃO NORMAL"}
        </span>
      </div>

      <section className="demand-config">

        <button
          type="button"
          className="demand-save-button"
          onClick={handleSaveConfig}
          disabled={saving}
        >
          {saving ? "Salvando..." : "Aplicar configuração"}
        </button>

        {saveError && (
          <p role="alert" style={{ color: "#f87171" }}>
            {saveError}
          </p>
        )}

        {saveSuccess && (
          <p role="status" style={{ color: "#4ade80" }}>
            {saveSuccess}
          </p>
        )}

        <div>
          <label>
            Limite contratado
          </label>

          <div className="demand-input">
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Ex.: 300"
              value={installationLimit}
              onChange={(e) => {
                configEditedRef.current = true;
                setSaveSuccess("");
                setInstallationLimit(e.target.value);
              }}
            />


            <span>kW</span>
          </div>
        </div>

        <div>
          <label>
            Consumo do estabelecimento
          </label>

          <div className="demand-input">

            <input
              type="number"
              min="0"
              step="any"
              placeholder="Ex.: 270"
              value={buildingConsumption}
              onChange={(e) => {
                configEditedRef.current = true;
                setSaveSuccess("");
                setBuildingConsumption(e.target.value);
              }}
            />


            <span>kW</span>
          </div>
        </div>
      </section>
      {data ? (
         <>


      <section className="demand-kpi-grid">

        <DemandCard
          title="Limite contratado"
          value={`${data.installation_limit_kw.toFixed(0)} kW`}
          icon={<Gauge size={20} />}
        />

        <DemandCard
          title="Consumo do estabelecimento"
          value={`${data.building_consumption_kw.toFixed(0)} kW`}
          icon={<Building2 size={20} />}
        />

        <DemandCard
          title="EVs solicitando"
          value={`${data.ev_requested_kw.toFixed(1)} kW`}
          icon={<Zap size={20} />}
        />

        <DemandCard
          title="Potência EV permitida"
          value={`${data.ev_allowed_kw.toFixed(1)} kW`}
          icon={<ShieldCheck size={20} />}
        />

      </section>

      <section className="dashboard-grid">

        <div className="dashboard-card demand-main-card">

          <div className="card-heading">
            <div>
              <h2>Utilização da instalação</h2>

              <p>
                Consumo após gerenciamento ChargeGrid
              </p>
            </div>

            <Gauge size={19} />
          </div>

          <div className="demand-utilization">

            <div className="demand-percentage">
              {data.utilization_pct.toFixed(1)}
              <span>%</span>
            </div>

            <div className="demand-progress">
              <div
                className={
                  data.limited
                    ? "demand-progress-fill danger"
                    : "demand-progress-fill"
                }
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            <div className="demand-progress-labels">
              <span>0 kW</span>

              <span>
                {data.installation_limit_kw.toFixed(0)} kW
              </span>
            </div>

          </div>

          <div className="power-breakdown">

            <div>
              <span>Prédio</span>

              <strong>
                {data.building_consumption_kw.toFixed(1)} kW
              </strong>
            </div>

            <span className="power-plus">+</span>

            <div>
              <span>EVs</span>

              <strong>
                {data.ev_allowed_kw.toFixed(1)} kW
              </strong>
            </div>

            <span className="power-equals">=</span>

            <div>
              <span>Total controlado</span>

              <strong>
                {data.projected_total_kw.toFixed(1)} kW
              </strong>
            </div>

          </div>

        </div>

        <div
          className={
            data.limited
              ? "dashboard-card demand-alert active"
              : "dashboard-card demand-alert"
          }
        >
          {data.limited ? (
            <>
              <div className="demand-alert-icon warning">
                <AlertTriangle size={25} />
              </div>

              <h2>Gerenciamento ativo</h2>

              <p>
                A demanda solicitada ultrapassaria o
                limite contratado da instalação.
              </p>

              <div className="demand-alert-values">
                <div>
                  <span>Solicitado</span>

                  <strong>
                    {data.total_requested_kw.toFixed(1)} kW
                  </strong>
                </div>

                <div>
                  <span>Redução aplicada</span>

                  <strong>
                    {data.reduction_kw.toFixed(1)} kW
                  </strong>
                </div>

                <div>
                  <span>Redução</span>

                  <strong>
                    {data.reduction_pct.toFixed(1)}%
                  </strong>
                </div>
              </div>

              <div className="demand-message">
                <Zap size={16} />

                Potência dos carregadores limitada
                temporariamente pela gestão de demanda.
              </div>
            </>
          ) : (
            <>
              <div className="demand-alert-icon success">
                <ShieldCheck size={25} />
              </div>

              <h2>Operação normal</h2>

              <p>
                A instalação possui capacidade suficiente
                para atender a demanda atual dos
                carregadores.
              </p>

              <div className="demand-message normal">
                <ShieldCheck size={16} />

                Nenhuma limitação de potência necessária.
              </div>
            </>
          )}
        </div>

      </section>

  </>
) : (
  <div className="dashboard-card">
    <p>
      {loading
        ? "Carregando indicadores de demanda..."
        : "Indicadores de demanda indisponíveis no momento."}
    </p>

    {error && (
      <p role="alert" style={{ color: "#f87171" }}>
        {error}
      </p>
    )}

    <p>
      Você ainda pode configurar o limite contratado
      e o consumo do estabelecimento acima.
    </p>
  </div>
)}

    </>
  );
}

function DemandCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
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
    </div>
  );
}
