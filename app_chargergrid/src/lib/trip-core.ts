import {
  searchPublicChargers,
  type PublicCharger,
} from "@/lib/open-charge-map.functions";

import { vehicleConsumption, findVehicleModel } from "@/lib/electric-vehicles";
import { planTrip, type ChargerInput, type LatLng, type TariffInput, type TripPlan } from "@/lib/trip-planner";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const OSRM_URL = "https://router.project-osrm.org";
// No navegador não dá para mudar o User-Agent (e tentar quebra o CORS); no servidor, identificamos o app.
const isServer = typeof window === "undefined";
const SERVER_HEADERS: Record<string, string> = isServer ? { "User-Agent": "ChargeGrid/1.0 (projeto academico FIAP)" } : {};

export type Place = { name: string; lat: number; lng: number };

export type TripResult = {
  origin: Place;
  destination: Place;
  vehicle: {
    model: string;
    batteryKwh: number;
    maxChargeKw: number;
    consumptionKwh100km: number;
    consumptionEstimated: boolean;
  };
  plan: TripPlan;
  /** trajeto simplificado para desenhar no mapa: [lat, lng][] */
  line: [number, number][];
  publicChargers: PublicCharger[];
  publicChargersUnavailable: boolean;
};

// ── Mapas ───────────────────────────────────────────────────────────

async function geocode(query: string): Promise<Place> {
  const coords = query.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (coords) return { name: query.trim(), lat: Number(coords[1]), lng: Number(coords[2]) };

  const url =
    `${NOMINATIM_URL}/search?format=json&limit=1&countrycodes=br&q=` + encodeURIComponent(query);
  const response = await fetch(url, {
    headers: { ...SERVER_HEADERS, "Accept-Language": "pt-BR" },
  });
  if (!response.ok) throw new Error("Não foi possível localizar o endereço agora.");

  const [first] = (await response.json()) as { display_name: string; lat: string; lon: string }[];
  if (!first) throw new Error(`Não encontrei o local "${query}". Tente cidade + estado, ex.: "Curitiba, PR".`);

  const shortName = first.display_name.split(",").slice(0, 2).join(",").trim();
  return { name: shortName, lat: Number(first.lat), lng: Number(first.lon) };
}

async function getRoute(from: LatLng, to: LatLng) {
  const url =
    `${OSRM_URL}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?overview=full&geometries=geojson`;
  const response = await fetch(url, { headers: SERVER_HEADERS });
  if (!response.ok) throw new Error("O serviço de rotas não respondeu. Tente de novo.");

  const body = (await response.json()) as {
    code: string;
    routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
  };
  const route = body.routes?.[0];
  if (body.code !== "Ok" || !route) throw new Error("Não encontrei uma rota de carro entre esses locais.");

  return {
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    points: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
  };
}

function simplify(points: LatLng[], max = 600): [number, number][] {
  const step = Math.max(1, Math.ceil(points.length / max));
  const out = points.filter((_, i) => i % step === 0);
  const last = points[points.length - 1];
  if (last && out[out.length - 1] !== last) out.push(last);
  return out.map((p) => [Number(p.lat.toFixed(5)), Number(p.lng.toFixed(5))]);
}

// ── Dados do Supabase ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Supa = any;

async function loadVehicle(supabase: Supa, userId: string) {
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (!customer) throw new Error("Seu cadastro de cliente não foi encontrado.");

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("model, battery_capacity_kwh, current_battery_pct, max_charge_power_kw, is_active")
    .eq("customer_id", customer.id);

  const v = (vehicles ?? []).find((x: { is_active: boolean }) => x.is_active) ?? vehicles?.[0];
  if (!v) throw new Error("Cadastre seu veículo na aba Veículo antes de planejar uma viagem.");

  const consumption = vehicleConsumption(v.model, Number(v.battery_capacity_kwh));
  return {
    model: v.model as string,
    batteryKwh: Number(v.battery_capacity_kwh),
    maxChargeKw: Number(v.max_charge_power_kw ?? findVehicleModel(v.model)?.maxChargeKw ?? 50),
    currentPct: Number(v.current_battery_pct ?? 80),
    consumptionKwh100km: consumption.kwhPer100km,
    consumptionEstimated: consumption.estimated,
  };
}

async function loadChargers(supabase: Supa): Promise<ChargerInput[]> {
  const { data } = await supabase
    .from("stations")
    .select("id, name, address, latitude, longitude, max_power_kw, status")
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  return (data ?? []).map(
    (s: { id: number; name: string | null; code?: string; address: string | null; latitude: number; longitude: number; max_power_kw: number; status: string }) => ({
      id: s.id,
      name: s.name ?? `Carregador ${s.id}`,
      address: s.address,
      lat: Number(s.latitude),
      lng: Number(s.longitude),
      powerKw: Number(s.max_power_kw) || 50,
      status: s.status,
    }),
  );
}

async function loadTariffs(supabase: Supa): Promise<TariffInput[]> {
  const { data } = await supabase.from("tariff_periods").select("label, starts_at, ends_at, price_per_kwh");
  return (data ?? []).map((t: { label: string; starts_at: string; ends_at: string; price_per_kwh: number }) => ({
    label: t.label,
    startsAt: t.starts_at,
    endsAt: t.ends_at,
    pricePerKwh: Number(t.price_per_kwh),
  }));
}

/** "2026-10-19T08:00" sem fuso = horário de Brasília */
function parseDeparture(value?: string | null) {
  if (!value) return new Date();
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  const date = new Date(hasZone ? value : `${value}-03:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

// ── Núcleo: usado pelo formulário e pela IA ─────────────────────────

export type TripRequest = {
  origin: string;
  destination: string;
  startBatteryPct?: number | null | undefined;
  departure?: string | null | undefined;
};

export async function runTrip(supabase: Supa, userId: string, req: TripRequest): Promise<TripResult> {
  const [vehicle, chargers, tariffs, origin, destination] = await Promise.all([
    loadVehicle(supabase, userId),
    loadChargers(supabase),
    loadTariffs(supabase),
    geocode(req.origin),
    geocode(req.destination),
  ]);

  const route = await getRoute(origin, destination);
  let publicChargers: PublicCharger[] = [];
  let publicChargersUnavailable = false;

  try {
    const sampledRoute = simplify(route.points, 90)
      .map(([lat, lng]) => ({ lat, lng }));

    publicChargers = await searchPublicChargers({
      data: { route: sampledRoute },
    });
  } catch (error) {
    publicChargersUnavailable = true;

    console.warn(
      "[ChargeGrid] Carregadores públicos indisponíveis:",
      error
    );
  }
  const startPct = Math.min(Math.max(req.startBatteryPct ?? vehicle.currentPct, 1), 100);

  const plan = planTrip({
    route: route.points,
    routeDistanceKm: route.distanceKm,
    routeDurationMin: route.durationMin,
    chargers,
    tariffs,
    vehicle,
    startBatteryPct: startPct,
    departure: parseDeparture(req.departure),
  });
  // Diferencia carregadores integrados ao ChargeGrid
  // de carregadores públicos encontrados no mapa.
  if (!plan.feasible && publicChargers.length > 0) {
    plan.problem =
      `Não encontramos carregadores integrados ao ChargeGrid/GoodWe ` +
      `que permitam completar esta viagem com segurança. ` +
      `Porém, encontramos ${publicChargers.length} carregadores públicos ` +
      `cadastrados no Open Charge Map próximos à rota. ` +
      `Esses carregadores ainda não fazem parte do planejamento ` +
      `automático do aplicativo. ` +
      `Confira no mapa as opções em azul e verifique compatibilidade, ` +
      `acesso e funcionamento antes de viajar.`;
  }

  return {
    origin,
    destination,
    vehicle: {
      model: vehicle.model,
      batteryKwh: vehicle.batteryKwh,
      maxChargeKw: vehicle.maxChargeKw,
      consumptionKwh100km: vehicle.consumptionKwh100km,
      consumptionEstimated: vehicle.consumptionEstimated,
    },
    plan,
    line: simplify(route.points),
    publicChargers,
    publicChargersUnavailable,
  };
}

/** Versão enxuta do resultado para a IA (sem a linha do mapa). */
export function summarizeForAi(trip: TripResult) {
  const p = trip.plan;
  const time = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit" });
  return {
    origem: trip.origin.name,
    destino: trip.destination.name,
    veiculo: trip.vehicle,
    viavel: p.feasible,
    problema: p.problem ?? null,
    distancia_km: p.distanceKm,
    tempo_dirigindo_min: p.drivingMinutes,
    tempo_carregando_min: p.chargingMinutes,
    tempo_total_min: p.totalMinutes,
    chegada_prevista: time(p.arrivalTime),
    bateria_saida_pct: p.startPct,
    bateria_chegada_pct: p.arrivalPct,
    custo_recarga_reais: p.chargingCost,
    carregadores_goodwe_na_rota: p.chargersOnRoute,
    consulta_publica_indisponivel:
      trip.publicChargersUnavailable,

    postos_publicos_candidatos_nao_validados:
      trip.publicChargers.slice(0, 12).map((c) => ({
        nome: c.name,
        endereco: c.address,
        operador: c.operator,
        conectores_cadastrados: c.connectors,
        maior_potencia_cadastrada_kw: c.powerKw,
        fonte: c.sourceUrl,
      })),
    paradas: p.stops.map((s, i) => ({
      ordem: i + 1,
      local: s.charger.name,
      endereco: s.charger.address,
      km_da_saida: s.kmFromStart,
      chega_com_pct: s.arrivalPct,
      sai_com_pct: s.departurePct,
      energia_kwh: s.energyKwh,
      minutos_carregando: s.chargeMinutes,
      tarifa: `${s.tariffLabel} R$ ${s.pricePerKwh.toFixed(2)}/kWh`,
      custo_reais: s.cost,
      horario_previsto: time(s.arrivalTime),
    })),
  };
}
