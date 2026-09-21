import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock3,
  Crosshair,
  Loader2,
  MapPin,
  Navigation,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import StationsMap from "@/components/stations-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { supabase } from "@/integrations/supabase/client";
import { searchChargingStations } from "@/lib/stations.functions";

export const Route = createFileRoute("/_authenticated/eletropostos")({
  head: () => ({
    meta: [
      {
        title: "Eletropostos em São Paulo — ChargeGrid",
      },
      {
        name: "description",
        content:
          "Encontre eletropostos próximos e consulte pontos de recarga.",
      },
      {
        property: "og:title",
        content: "Eletropostos — ChargeGrid",
      },
      {
        property: "og:description",
        content: "Encontre pontos de recarga em São Paulo.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
  }),
  component: StationsPage,
});

/* =========================================================
   LOCALIZAÇÃO PADRÃO
========================================================= */

const SAO_PAULO = {
  latitude: -23.55052,
  longitude: -46.63331,
};

/* =========================================================
   TIPOS
========================================================= */

type PublicStation = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number | null;
  ratingCount?: number | null;
};

type AvailabilityRow = {
  station_id: string;
  station_name: string;
  station_address: string;
  latitude: number;
  longitude: number;
  availability_is_demo: boolean;
  spot_id: string;
  spot_label: string;
  connector_type: string;
  power_kw: number;
  operational_status: string;
  is_available: boolean;
};



/* =========================================================
   POSTOS FALLBACK
   ---------------------------------------------------------
   Se a busca externa falhar, esses postos continuam
   aparecendo no mapa.
========================================================= */

const FALLBACK_STATIONS: PublicStation[] = [
  {
    id: "fallback-ezvolt-caninde",
    name: "EZVolt Canindé",
    address: "Rua Araguaia, 450 - Canindé, São Paulo - SP",
    latitude: -23.5157,
    longitude: -46.6148,
    rating: null,
    ratingCount: null,
  },
  {
    id: "fallback-teld-faria-lima",
    name: "Teld Eco — Faria Lima",
    address: "Av. Brigadeiro Faria Lima, 2812 - Jardim Europa, São Paulo - SP",
    latitude: -23.5777,
    longitude: -46.6846,
    rating: null,
    ratingCount: null,
  },
  {
    id: "fallback-teld-campo-belo",
    name: "Teld Eco — Campo Belo",
    address: "Av. Vereador José Diniz, 3670 - Campo Belo, São Paulo - SP",
    latitude: -23.6277,
    longitude: -46.6757,
    rating: null,
    ratingCount: null,
  },
  {
    id: "fallback-cidade-jardim",
    name: "Shopping Cidade Jardim",
    address: "Av. Magalhães de Castro, 12000 - Cidade Jardim, São Paulo - SP",
    latitude: -23.6008,
    longitude: -46.7255,
    rating: null,
    ratingCount: null,
  },
  {
    id: "fallback-neosolar",
    name: "NeoSolar / NeoCharge",
    address: "Rua Morgado de Mateus, 516 - Vila Mariana, São Paulo - SP",
    latitude: -23.5929,
    longitude: -46.6465,
    rating: null,
    ratingCount: null,
  },
  {
    id: "fallback-byd-mooca",
    name: "BYD — Mooca",
    address: "Av. Alcântara Machado, 576 - Mooca, São Paulo - SP",
    latitude: -23.5466,
    longitude: -46.5987,
    rating: null,
    ratingCount: null,
  },
  {
    id: "fallback-ezvolt-vila-mariana",
    name: "EZVolt — Vila Mariana",
    address: "Rua Apeninos, 222 - Vila Mariana, São Paulo - SP",
    latitude: -23.5726,
    longitude: -46.6382,
    rating: null,
    ratingCount: null,
  },
  {
    id: "fallback-bmw-paulista",
    name: "BMW Charging Station",
    address: "Av. Paulista, 1230 - Bela Vista, São Paulo - SP",
    latitude: -23.5631,
    longitude: -46.6528,
    rating: null,
    ratingCount: null,
  },
];

/* =========================================================
   DISTÂNCIA
========================================================= */

function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const radius = 6371;

  const dLat =
    ((b.latitude - a.latitude) * Math.PI) / 180;

  const dLon =
    ((b.longitude - a.longitude) * Math.PI) / 180;

  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return (
    radius *
    2 *
    Math.atan2(
      Math.sqrt(value),
      Math.sqrt(1 - value),
    )
  );
}

/* =========================================================
   GOOGLE MAPS
========================================================= */

function openGoogleMaps(address: string) {
  const url =
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address,
    )}`;

  window.open(url, "_blank", "noopener,noreferrer");
}

/* =========================================================
   PÁGINA
========================================================= */

function StationsPage() {
  const searchStations = useQuery({
    queryKey: [
      "nearby-stations",
      "sao-paulo",
    ],
    queryFn: async () => {
      try {
        const result = await searchChargingStations({
          data: SAO_PAULO,
        });

        return result as PublicStation[];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const queryClient = useQueryClient();

  const [center, setCenter] =
    useState(SAO_PAULO);

  const [locationLabel, setLocationLabel] =
    useState("São Paulo");

  const [selectedId, setSelectedId] =
    useState<string>();

  const [selectedSpot, setSelectedSpot] =
    useState<AvailabilityRow>();

  const [secondsLeft, setSecondsLeft] =
    useState(0);

  /* =======================================================
     POSTOS DE PARCEIROS
  ======================================================= */

  const partnersQuery = useQuery({
  queryKey: ["partner-availability"],
  queryFn: async () => {
    return [] as AvailabilityRow[];
  },
});

  


  /* =======================================================
     AGRUPAR PARCEIROS
  ======================================================= */

  const partnerStations = useMemo(() => {
    const grouped =
      new Map<string, AvailabilityRow[]>();

    for (const row of
      partnersQuery.data ?? []) {
      const current =
        grouped.get(row.station_id) ?? [];

      grouped.set(row.station_id, [
        ...current,
        row,
      ]);
    }

    return Array.from(
      grouped.values(),
    );
  }, [partnersQuery.data]);

  /* =======================================================
     POSTOS PÚBLICOS
     Se a busca não retornar nada,
     usa o fallback.
  ======================================================= */

  const publicStations =
    useMemo(() => {
      const externalStations =
        searchStations.data ?? [];

      const source =
        externalStations.length > 0
          ? externalStations
          : FALLBACK_STATIONS;

      return source.filter(
        (station) =>
          !partnerStations.some(
            (rows) =>
              rows[0]?.station_name ===
              station.name,
          ),
      );
    }, [
      searchStations.data,
      partnerStations,
    ]);

  /* =======================================================
     MARCADORES DO MAPA
  ======================================================= */

  const markers = useMemo(() => {
    const partnerMarkers =
      partnerStations.flatMap(
        (rows) => {
          const station = rows[0];

          if (!station) {
            return [];
          }

          return [
            {
              id: station.station_id,
              name: station.station_name,
              latitude: station.latitude,
              longitude: station.longitude,
              isPartner: true,
            },
          ];
        },
      );

    const publicMarkers =
      publicStations.map(
        (station) => ({
          id: station.id,
          name: station.name,
          latitude: station.latitude,
          longitude: station.longitude,
          isPartner: false,
        }),
      );

    return [
      ...partnerMarkers,
      ...publicMarkers,
    ];
  }, [
    partnerStations,
    publicStations,
  ]);

  /* =======================================================
     RESERVAR VAGA
  ======================================================= */

  
  /* =======================================================
     CANCELAR RESERVA
  ======================================================= */

  

  /* =======================================================
     LOCALIZAÇÃO DO USUÁRIO
  ======================================================= */

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error(
        "Seu aparelho não oferece localização.",
      );

      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({
          latitude:
            position.coords.latitude,
          longitude:
            position.coords.longitude,
        });

        setLocationLabel(
          "perto de você",
        );
      },

      () => {
        toast.error(
          "Não foi possível acessar sua localização. Mantivemos São Paulo.",
        );

        setCenter(SAO_PAULO);
        setLocationLabel(
          "São Paulo",
        );
      },

      {
        enableHighAccuracy: false,
        timeout: 8000,
      },
    );
  };

  /* =======================================================
     CLICAR NO MARCADOR
  ======================================================= */

  const selectMarker =
    useCallback(
      (id: string) => {
        setSelectedId(id);

        window.setTimeout(() => {
          document
            .getElementById(
              `station-${id}`,
            )
            ?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
        }, 50);
      },
      [],
    );

  const mins =
    Math.floor(secondsLeft / 60);

  const secs =
    String(
      secondsLeft % 60,
    ).padStart(2, "0");

  
  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <AppShell>
      {/* ===================================================
          HEADER
      =================================================== */}

      

      {/* ===================================================
          RESERVA ATIVA
      =================================================== */}

     

      {/* ===================================================
          MAPA
      =================================================== */}

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="relative h-[420px] w-full sm:h-[520px]">
          <StationsMap
            stations={markers}
            center={center}
            {...(selectedId
              ? { selectedId }
              : {})}
            onSelect={
              selectMarker
            }
          />

          {/* Contador no mapa */}

          <div className="absolute left-4 top-4 z-10 rounded-lg border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
            <p className="text-sm font-semibold">
              {markers.length}{" "}
              eletropostos
            </p>

            <p className="text-xs text-muted-foreground">
              São Paulo
            </p>
          </div>
        </div>
      </div>

      {/* ===================================================
          CONTROLES ABAIXO DO MAPA
      =================================================== */}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Clique em um marcador para
          visualizar o posto.
        </p>

        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            searchStations.refetch()
          }
          disabled={
            searchStations.isFetching
          }
        >
          <RefreshCw
            className={
              searchStations.isFetching
                ? "animate-spin"
                : ""
            }
          />

          Atualizar postos
        </Button>
      </div>

      {/* ===================================================
          AVISO DE FALLBACK
      =================================================== */}

      {searchStations.isError && (
        <div className="mt-4 rounded-lg border border-border bg-secondary p-4 text-sm">
          Não foi possível atualizar
          os postos automaticamente.
          Exibindo os pontos disponíveis
          no mapa.
        </div>
      )}

      {/* ===================================================
          GRID DE POSTOS
      =================================================== */}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* =================================================
            PARCEIROS
        ================================================= */}


        {/* =================================================
            POSTOS PÚBLICOS
        ================================================= */}

        {publicStations.map(
          (station) => (
            <article
              id={`station-${station.id}`}
              key={station.id}
              className={`rounded-xl border bg-card p-5 shadow-sm transition ${
                selectedId ===
                station.id
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge variant="outline">
                    Ponto de recarga
                  </Badge>

                  <h2 className="mt-3 text-lg font-bold">
                    {station.name}
                  </h2>
                </div>

                {station.rating !=
                  null && (
                  <span className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 fill-primary text-primary" />

                    {station.rating.toFixed(
                      1,
                    )}
                  </span>
                )}
              </div>

              <p className="mt-2 flex gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />

                {station.address}
              </p>

              <p className="mt-2 text-xs text-muted-foreground">
                A{" "}
                {distanceKm(
                  center,
                  station,
                ).toFixed(1)}{" "}
                km
                {station.ratingCount
                  ? ` · ${station.ratingCount} avaliações`
                  : ""}
              </p>

              <div className="mt-4 flex items-center gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                <PlugZap className="h-4 w-4 shrink-0" />

                <span>
                  Ponto de recarga
                  disponível para
                  consulta no mapa.
                </span>
              </div>

              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() =>
                  openGoogleMaps(
                    station.address,
                  )
                }
              >
                <Navigation />
                Abrir rota no Google Maps
              </Button>
            </article>
          ),
        )}
      </div>

      {/* ===================================================
          LOADING
      =================================================== */}

      {searchStations.isLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="animate-spin" />

          Carregando eletropostos...
        </div>
      )}

      {/* ===================================================
          SEM POSTOS
      =================================================== */}

      {!searchStations.isLoading &&
        markers.length === 0 && (
          <div className="mt-6 rounded-lg border border-border bg-card p-8 text-center">
            <MapPin className="mx-auto h-10 w-10 text-muted-foreground" />

            <h2 className="mt-3 font-bold">
              Nenhum eletroposto encontrado
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Tente atualizar a busca.
            </p>
          </div>
        )}

      {/* ===================================================
          MODAL DE RESERVA
      =================================================== */}

      
    </AppShell>
  );
}