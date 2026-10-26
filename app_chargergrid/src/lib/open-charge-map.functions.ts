
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PublicCharger = {
  id: number;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  powerKw: number | null;
  connectors: string[];
  operator: string | null;
  provider: string;
  sourceUrl: string;
};

type Point = { lat: number; lng: number };

type OcmPoi = {
  ID: number;
  AddressInfo?: {
    Title?: string;
    AddressLine1?: string;
    Town?: string;
    Latitude?: number;
    Longitude?: number;
  };
  Connections?: {
    PowerKW?: number;
    ConnectionType?: { Title?: string };
    StatusType?: { IsOperational?: boolean | null };
  }[];
  StatusType?: { IsOperational?: boolean | null };
  UsageType?: { IsPublicAccess?: boolean | null };
  OperatorInfo?: { Title?: string };
  DataProvider?: { Title?: string };
};

const inputSchema = z.object({
  route: z.array(
    z.object({
      lat: z.number().finite().min(-90).max(90),
      lng: z.number().finite().min(-180).max(180),
    })
  ).min(2).max(120),
});

// Converte pontos para o formato de polyline
// utilizado pela API de mapas.
function encodePolyline(points: Point[]): string {
  let previousLat = 0;
  let previousLng = 0;
  let encoded = "";

  function encodeDelta(delta: number): string {
    let value = delta < 0
      ? ~(delta << 1)
      : delta << 1;

    let result = "";

    while (value >= 0x20) {
      result += String.fromCharCode(
        (0x20 | (value & 0x1f)) + 63
      );

      value >>>= 5;
    }

    return result + String.fromCharCode(value + 63);
  }

  for (const point of points) {
    const lat = Math.round(point.lat * 1e5);
    const lng = Math.round(point.lng * 1e5);

    encoded += encodeDelta(lat - previousLat);
    encoded += encodeDelta(lng - previousLng);

    previousLat = lat;
    previousLng = lng;
  }

  return encoded;
}

// Cache temporário por rota: evita repetir
// a consulta sempre que a tela renderiza.
const cache = new Map<
  string,
  { expires: number; stations: PublicCharger[] }
>();

export const searchPublicChargers = createServerFn({
  method: "POST",
})
  .validator((input) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const { config } = await import("dotenv");
    config({ path: ".env" });

    const key = process.env["OPEN_CHARGE_MAP_API_KEY"];

    if (!key) {
      throw new Error(
        "OPEN_CHARGE_MAP_API_KEY não configurada."
      );
    }

    const polyline = encodePolyline(data.route);

    const cached = cache.get(polyline);

    if (cached && cached.expires > Date.now()) {
      return cached.stations;
    }

    const url = new URL(
      "https://api.openchargemap.io/v3/poi/"
    );

    url.searchParams.set("output", "json");
    url.searchParams.set("countrycode", "BR");
    url.searchParams.set("polyline", polyline);
    url.searchParams.set("distance", "10");
    url.searchParams.set("distanceunit", "KM");
    url.searchParams.set("maxresults", "250");
    url.searchParams.set("opendata", "true");
    url.searchParams.set("client", "ChargeGridAI");

    const response = await fetch(url, {
      headers: {
        "X-API-Key": key,
        "User-Agent": "ChargeGridAI/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      throw new Error(
        `Falha na consulta ao Open Charge Map: HTTP ${response.status}`
      );
    }

    const dataOcm = await response.json() as OcmPoi[];

    if (!Array.isArray(dataOcm)) {
      throw new Error("Resposta inválida do Open Charge Map.");
    }

    const stations: PublicCharger[] = dataOcm
      .filter((poi) => {
        if (poi.StatusType?.IsOperational === false) {
          return false;
        }

        if (poi.UsageType?.IsPublicAccess === false) {
          return false;
        }

        return true;
      })
      .map((poi) => {
        const connections = (poi.Connections ?? [])
          .filter(
            (c) => c.StatusType?.IsOperational !== false
          );

        const powers = connections
          .map((c) => Number(c.PowerKW))
          .filter(
            (kw) => Number.isFinite(kw) && kw > 0
          );

        const connectors = [
          ...new Set(
            connections
              .map((c) => c.ConnectionType?.Title)
              .filter((name): name is string =>
                Boolean(name)
              )
          ),
        ];

        const address = [
          poi.AddressInfo?.AddressLine1,
          poi.AddressInfo?.Town,
        ].filter(Boolean).join(", ");

        return {
          id: poi.ID,
          name:
            poi.AddressInfo?.Title ||
            `Eletroposto ${poi.ID}`,
          address: address || null,
          lat: Number(poi.AddressInfo?.Latitude),
          lng: Number(poi.AddressInfo?.Longitude),
          powerKw: powers.length
            ? Math.max(...powers)
            : null,
          connectors,
          operator: poi.OperatorInfo?.Title ?? null,
          provider:
            poi.DataProvider?.Title ??
            "Open Charge Map",
          sourceUrl:
            `https://openchargemap.org/site/poi/details/${poi.ID}`,
        };
      })
      .filter((station) =>
        Number.isInteger(station.id) &&
        station.id > 0 &&
        Number.isFinite(station.lat) &&
        Number.isFinite(station.lng)
      );

    // Evita crescimento ilimitado em memória.
    if (cache.size > 60) cache.clear();

    cache.set(polyline, {
      stations,
      expires: Date.now() + 60 * 60 * 1000,
    });

    return stations;
  });
