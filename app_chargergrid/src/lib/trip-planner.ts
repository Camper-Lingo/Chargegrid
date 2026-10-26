// Planejador de viagem — cálculos puros (sem rede, sem IA).
//
// Recebe a rota (lista de coordenadas), os carregadores GoodWe e os dados
// do carro, e decide onde parar, quanto carregar, quanto tempo e quanto custa.
// A IA só explica o resultado; os números saem daqui.

export type LatLng = { lat: number; lng: number };

export type ChargerInput = {
  id: number;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  powerKw: number;
  status: string;
};

export type TariffInput = { label: string; startsAt: string; endsAt: string; pricePerKwh: number };

export type PlannerSettings = {
  /** Não chegar abaixo disso (%), margem de segurança */
  reservePct: number;
  /** Até quanto carregar em cada parada (%) */
  targetPct: number;
  /** Distância máxima do carregador até a rota (km) */
  maxDetourKm: number;
  /** Fator de potência média (a carga desacelera perto de 80%) */
  chargeEfficiency: number;
};

export const DEFAULT_SETTINGS: PlannerSettings = {
  reservePct: 15,
  targetPct: 80,
  maxDetourKm: 8,
  chargeEfficiency: 0.8,
};

export type TripInput = {
  route: LatLng[];
  /** distância oficial da rota em km (do serviço de rotas) */
  routeDistanceKm: number;
  /** tempo de direção da rota em minutos (do serviço de rotas) */
  routeDurationMin: number;
  chargers: ChargerInput[];
  tariffs: TariffInput[];
  vehicle: {
    model: string;
    batteryKwh: number;
    maxChargeKw: number;
    consumptionKwh100km: number;
  };
  startBatteryPct: number;
  departure: Date;
  settings?: Partial<PlannerSettings>;
};

export type TripStop = {
  charger: ChargerInput;
  kmFromStart: number;
  detourKm: number;
  arrivalPct: number;
  departurePct: number;
  energyKwh: number;
  chargeMinutes: number;
  pricePerKwh: number;
  tariffLabel: string;
  cost: number;
  arrivalTime: string; // ISO
};

export type TripPlan = {
  feasible: boolean;
  problem?: string | undefined;
  distanceKm: number;
  drivingMinutes: number;
  chargingMinutes: number;
  totalMinutes: number;
  energyUsedKwh: number;
  chargingCost: number;
  startPct: number;
  arrivalPct: number;
  rangeKm: number;
  stops: TripStop[];
  chargersOnRoute: number;
  arrivalTime: string; // ISO
  settings: PlannerSettings;
};

// ── Geometria ───────────────────────────────────────────────────────

export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Para cada carregador: em que km da rota ele fica e quão longe da estrada está. */
export function projectChargers(route: LatLng[], routeDistanceKm: number, chargers: ChargerInput[]) {
  if (route.length < 2) return [];

  // distância acumulada ao longo da linha da rota
  const cumulative = [0];
  for (let i = 1; i < route.length; i++) {
    cumulative.push(cumulative[i - 1]! + haversineKm(route[i - 1]!, route[i]!));
  }
  const lineLength = cumulative[cumulative.length - 1]! || 1;
  const scale = routeDistanceKm / lineLength; // ajusta para a distância oficial

  return chargers.map((charger) => {
    let best = Infinity;
    let bestIndex = 0;
    for (let i = 0; i < route.length; i++) {
      const d = haversineKm(charger, route[i]!);
      if (d < best) {
        best = d;
        bestIndex = i;
      }
    }
    return { charger, kmFromStart: cumulative[bestIndex]! * scale, detourKm: best };
  });
}

// ── Tarifa ──────────────────────────────────────────────────────────

function minutesOfDay(hhmm: string) {
  const [h = "0", m = "0"] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
}

/** Hora/minuto em Brasília, independente do fuso do servidor. */
function brasiliaClock(date: Date) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const weekday = get("weekday").toLowerCase();
  return {
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    weekend: weekday.startsWith("sáb") || weekday.startsWith("sab") || weekday.startsWith("dom"),
  };
}

/** Tarifa no horário. Usa a tabela tariff_periods; sem ela, usa a regra da API Python. */
export function tariffAt(date: Date, tariffs: TariffInput[]) {
  const { minutes, weekend } = brasiliaClock(date);

  if (tariffs.length) {
    const match = tariffs.find((t) => {
      const start = minutesOfDay(t.startsAt);
      const end = minutesOfDay(t.endsAt);
      return start <= end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
    });
    if (match) return { label: match.label, price: match.pricePerKwh };
  }

  if (weekend) return { label: "Fora de Ponta (FDS)", price: 0.59 };
  if (minutes < 16 * 60) return { label: "Fora de Ponta", price: 0.59 };
  if (minutes < 17 * 60) return { label: "Intermediário", price: 0.87 };
  if (minutes < 20 * 60) return { label: "Ponta", price: 1.39 };
  if (minutes < 21 * 60) return { label: "Intermediário", price: 0.87 };
  return { label: "Fora de Ponta", price: 0.59 };
}

// ── Planejamento ────────────────────────────────────────────────────

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

export function planTrip(input: TripInput): TripPlan {
  const s = { ...DEFAULT_SETTINGS, ...input.settings };
  const { vehicle } = input;
  const total = input.routeDistanceKm;
  const kwhPerKm = vehicle.consumptionKwh100km / 100;
  const pctPerKm = (kwhPerKm / vehicle.batteryKwh) * 100; // % de bateria gasto por km
  const minPerKm = total > 0 ? input.routeDurationMin / total : 1;

  const available = projectChargers(input.route, total, input.chargers)
    .filter((c) => c.detourKm <= s.maxDetourKm && c.charger.status !== "offline")
    .sort((a, b) => a.kmFromStart - b.kmFromStart);

  const stops: TripStop[] = [];
  let pos = 0;
  let pct = input.startBatteryPct;
  let clock = input.departure.getTime();
  let chargingMinutes = 0;
  let chargingCost = 0;

  const reachFrom = (km: number, battery: number) => km + Math.max(battery - s.reservePct, 0) / pctPerKm;

  const result = (feasible: boolean, arrivalPct: number, problem?: string): TripPlan => ({
    feasible,
    problem,
    distanceKm: round(total),
    drivingMinutes: Math.round(input.routeDurationMin),
    chargingMinutes: Math.round(chargingMinutes),
    totalMinutes: Math.round(input.routeDurationMin + chargingMinutes),
    energyUsedKwh: round(total * kwhPerKm),
    chargingCost: round(chargingCost, 2),
    startPct: input.startBatteryPct,
    arrivalPct: round(arrivalPct, 0),
    rangeKm: round((100 - s.reservePct) / pctPerKm, 0),
    stops,
    chargersOnRoute: available.length,
    arrivalTime: new Date(clock + (total - pos) * minPerKm * 60_000).toISOString(),
    settings: s,
  });

  for (let guard = 0; guard < 50; guard++) {
    // Chega no destino com a bateria atual?
    if (reachFrom(pos, pct) >= total) {
      return result(true, pct - (total - pos) * pctPerKm);
    }

    // Senão: o carregador mais distante que ainda dá para alcançar
    const reach = reachFrom(pos, pct);
    const candidates = available.filter(
      (c) => c.kmFromStart > pos + 1 && c.kmFromStart + c.detourKm <= reach,
    );
    const next = candidates[candidates.length - 1];

    if (!next) {
      const nextCharger = available.find((c) => c.kmFromStart > pos + 1);
      const gapEnd = nextCharger ? nextCharger.kmFromStart : total;
      return result(
        false,
        0,
        `Sem carregador GoodWe ao alcance: a bateria dura até o km ${Math.round(reach)}, ` +
          `mas o próximo ponto de recarga ${nextCharger ? `fica no km ${Math.round(gapEnd)}` : "não existe até o destino"}.`,
      );
    }

    // Dirige até o carregador
    const driveKm = next.kmFromStart - pos + next.detourKm;
    clock += (next.kmFromStart - pos) * minPerKm * 60_000 + next.detourKm * 1.5 * 60_000;
    const arrivalPct = pct - driveKm * pctPerKm;

    // Quanto carregar: o necessário para chegar ao destino (com folga) ou até a meta
    const neededForDestination = s.reservePct + (total - next.kmFromStart + next.detourKm) * pctPerKm + 3;
    // Se faltar pouco (até 15% acima da meta) para chegar direto, carrega um pouco mais
    // e evita uma parada extra só para "completar".
    let departurePct =
      neededForDestination <= Math.min(s.targetPct + 15, 100)
        ? Math.max(neededForDestination, arrivalPct)
        : s.targetPct;

    // Se com a meta não alcança nem o próximo carregador nem o destino, enche até 100%
    const afterReach = reachFrom(next.kmFromStart, departurePct - next.detourKm * pctPerKm);
    const hasNext = available.some((c) => c.kmFromStart > next.kmFromStart + 1 && c.kmFromStart + c.detourKm <= afterReach);
    if (afterReach < total && !hasNext) departurePct = Math.min(Math.max(neededForDestination, s.targetPct), 100);

    const energyKwh = Math.max(((departurePct - arrivalPct) / 100) * vehicle.batteryKwh, 0);
    const powerKw = Math.min(vehicle.maxChargeKw || next.charger.powerKw, next.charger.powerKw) * s.chargeEfficiency;
    const minutes = powerKw > 0 ? (energyKwh / powerKw) * 60 : 0;
    const tariff = tariffAt(new Date(clock), input.tariffs);
    const cost = energyKwh * tariff.price;

    stops.push({
      charger: next.charger,
      kmFromStart: round(next.kmFromStart),
      detourKm: round(next.detourKm),
      arrivalPct: round(arrivalPct, 0),
      departurePct: round(departurePct, 0),
      energyKwh: round(energyKwh),
      chargeMinutes: Math.round(minutes),
      pricePerKwh: tariff.price,
      tariffLabel: tariff.label,
      cost: round(cost, 2),
      arrivalTime: new Date(clock).toISOString(),
    });

    chargingMinutes += minutes;
    chargingCost += cost;
    clock += minutes * 60_000 + next.detourKm * 1.5 * 60_000;
    pct = departurePct - next.detourKm * pctPerKm;
    pos = next.kmFromStart;
  }

  return result(false, 0, "Não foi possível montar o plano de paradas.");
}
