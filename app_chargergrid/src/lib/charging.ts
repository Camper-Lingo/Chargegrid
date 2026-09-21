// Cálculos de recarga e tarifas — ChargeGrid

export interface TariffPeriod {
  id: string;
  label: string;
  starts_at: string; // "HH:MM" ou "HH:MM:SS"
  ends_at: string;
  price_per_kwh: number;
}

export interface Vehicle {
  id: number;
  customer_id: number;
  model: string;
  battery_capacity_kwh: number;
  current_battery_pct: number;
  max_charge_power_kw: number;
}

export interface ChargingSession {
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
  ended_at: string | null;

  duration_minutes: number | null;
  status: string;
}

/** Energia necessária para adicionar `pct` pontos percentuais de bateria */
export function energyKwh(capacityKwh: number, pct: number): number {
  return (capacityKwh * pct) / 100;
}

export function chargeCost(kwh: number, pricePerKwh: number): number {
  return kwh * pricePerKwh;
}

/** Tempo estimado em minutos, limitado pela menor potência (veículo vs estação) */
export function chargeMinutes(
  kwh: number,
  vehiclePowerKw: number,
  stationPowerKw: number
): number {
  const power = Math.min(vehiclePowerKw, stationPowerKw);
  if (power <= 0) return 0;
  return (kwh / power) * 60;
}

export function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return "<1 min";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `~${m} min`;
  if (m === 0) return `~${h}h`;
  return `~${h}h${String(m).padStart(2, "0")}`;
}

function toMinutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Tarifa vigente no horário informado (padrão: agora) */
export function activeTariff(
  tariffs: TariffPeriod[],
  now: Date = new Date()
): TariffPeriod | null {
  const mins = now.getHours() * 60 + now.getMinutes();

  return (
    tariffs.find((t) => {
      const start = toMinutes(t.starts_at);
      const end = toMinutes(t.ends_at);

      // Período normal: ex. 17:30 → 20:30
      if (start < end) {
        return mins >= start && mins < end;
      }

      // Período que atravessa a meia-noite:
      // ex. 21:30 → 16:30
      if (start > end) {
        return mins >= start || mins < end;
      }

      return false;
    }) ?? null
  );
}

export interface SavingsTip {
  label: string;
  starts_at: string;
  price_per_kwh: number;
  savings: number;
}

/** Sugere a faixa mais barata ainda hoje (após o horário atual), se economizar */
export function bestSavingsTip(
  tariffs: TariffPeriod[],
  kwhNeeded: number,
  now: Date = new Date()
): SavingsTip | null {
  const current = activeTariff(tariffs, now);
  if (!current || kwhNeeded <= 0) return null;
  const mins = now.getHours() * 60 + now.getMinutes();
  const later = tariffs.filter((t) => toMinutes(t.starts_at) > mins);
  if (later.length === 0) return null;
  const cheapest = later.reduce((a, b) =>
    a.price_per_kwh <= b.price_per_kwh ? a : b
  );
  const savings = (current.price_per_kwh - cheapest.price_per_kwh) * kwhNeeded;
  if (savings <= 0.005) return null;
  return {
    label: cheapest.label,
    starts_at: cheapest.starts_at.slice(0, 5),
    price_per_kwh: cheapest.price_per_kwh,
    savings,
  };
}

/** Opções rápidas de recarga */
export const QUICK_OPTIONS = [10, 20, 30, 40, 100] as const;

/** Potência padrão da estação simulada (kW) */
export const STATION_POWER_KW = 150;
