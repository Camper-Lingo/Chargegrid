import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export type StationMarker = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  isPartner?: boolean;
};

type Props = {
  stations: StationMarker[];
  center: {
    latitude: number;
    longitude: number;
  };
  selectedId?: string;
  onSelect: (id: string) => void;
};

function MapController({
  center,
  stations,
  selectedId,
}: {
  center: { latitude: number; longitude: number };
  stations: StationMarker[];
  selectedId?: string | undefined;
}) {
  const map = useMap();

  useEffect(() => {
    const selected = stations.find(
      (station) => station.id === selectedId,
    );

    if (selected) {
      map.setView(
        [selected.latitude, selected.longitude],
        15,
      );
      return;
    }

    if (stations.length > 1) {
      const bounds = L.latLngBounds(
        stations.map((station) => [
          station.latitude,
          station.longitude,
        ]),
      );

      map.fitBounds(bounds, {
        padding: [40, 40],
      });
    } else {
      map.setView(
        [center.latitude, center.longitude],
        12,
      );
    }
  }, [map, center, stations, selectedId]);

  return null;
}

export default function StationsMap({
  stations,
  center,
  selectedId,
  onSelect,
}: Props) {
  return (
    <div className="h-full min-h-80 w-full overflow-hidden">
      <MapContainer
        center={[
          center.latitude,
          center.longitude,
        ]}
        zoom={12}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController
          center={center}
          stations={stations}
          selectedId={selectedId}
        />

        {stations.map((station) => (
          <Marker
            key={station.id}
            position={[
              station.latitude,
              station.longitude,
            ]}
            eventHandlers={{
              click: () => onSelect(station.id),
            }}
          >
            <Popup>
              <div className="min-w-40">
                <p className="font-bold">
                  {station.name}
                </p>

                <p className="mt-1 text-sm">
                  {station.isPartner
                    ? "⚡ ChargeGrid"
                    : "🔌 Eletroposto"}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}