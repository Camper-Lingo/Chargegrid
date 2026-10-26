import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TripResult } from "@/lib/trip-core";

function FitBounds({ line }: { line: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (line.length > 1) map.fitBounds(L.latLngBounds(line), { padding: [24, 24] });
  }, [line, map]);
  return null;
}

export default function TripMap({ trip }: { trip: TripResult }) {
  const first = trip.line[0] ?? [trip.origin.lat, trip.origin.lng];

  return (
    <MapContainer
      center={first}
      zoom={7}
      scrollWheelZoom={false}
      className="h-[360px] w-full rounded-xl border border-border"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Dados de recarga: <a href="https://openchargemap.org">Open Charge Map</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds line={trip.line} />

      <Polyline positions={trip.line} pathOptions={{ color: "#ef233c", weight: 5, opacity: 0.85 }} />

      <CircleMarker center={[trip.origin.lat, trip.origin.lng]} radius={8} pathOptions={{ color: "#fff", fillColor: "#22c55e", fillOpacity: 1 }}>
        <Tooltip>Saída: {trip.origin.name}</Tooltip>
      </CircleMarker>

      <CircleMarker center={[trip.destination.lat, trip.destination.lng]} radius={8} pathOptions={{ color: "#fff", fillColor: "#3b82f6", fillOpacity: 1 }}>
        <Tooltip>Chegada: {trip.destination.name}</Tooltip>
      </CircleMarker>

      {trip.plan.stops.map((stop, index) => (
        <CircleMarker
          key={stop.charger.id}
          center={[stop.charger.lat, stop.charger.lng]}
          radius={11}
          pathOptions={{ color: "#fff", weight: 2, fillColor: "#ef233c", fillOpacity: 1 }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]}>
            {index + 1}
          </Tooltip>
          <Popup>
            <strong>{stop.charger.name}</strong>
            <br />
            km {Math.round(stop.kmFromStart)} · {stop.arrivalPct}% → {stop.departurePct}%
            <br />
            {stop.chargeMinutes} min · R$ {stop.cost.toFixed(2)}
          </Popup>
        </CircleMarker>
      ))}

{/* Eletropostos públicos cadastrados no OCM */}
{trip.publicChargers.map((charger) => (
  <CircleMarker
    key={`ocm-${charger.id}`}
    center={[charger.lat, charger.lng]}
    radius={6}
    pathOptions={{
      color: "#0284c7",
      fillColor: "#38bdf8",
      fillOpacity: 0.85,
      weight: 2,
    }}
  >
    <Popup>
      <div className="space-y-1">
        <strong>{charger.name}</strong>

        <p>
          {charger.address ??
            "Endereço não informado"}
        </p>

        <p>
          Operador:{" "}
          {charger.operator ?? "Não informado"}
        </p>

        <p>
          Maior potência cadastrada:{" "}
          {charger.powerKw
            ? `${charger.powerKw} kW`
            : "Não informada"}
        </p>

        <p>
          Conectores:{" "}
          {charger.connectors.join(", ") ||
            "Não informados"}
        </p>

        <p>
          Provedor: {charger.provider}
        </p>

        <p>
          <strong>
            Disponibilidade, compatibilidade,
            preço e desvio não verificados.
          </strong>
        </p>

        <a
          href={charger.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          Ver cadastro no Open Charge Map
        </a>
      </div>
    </Popup>
  </CircleMarker>
))}

    </MapContainer>
  );
}
