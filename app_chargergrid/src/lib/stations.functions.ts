import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const searchInput = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
};

export const searchChargingStations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => searchInput.parse(input))
  .handler(async ({ data }) => {
    const lovableKey = process.env['LOVABLE_API_KEY'];
    const mapsKey = process.env['GOOGLE_MAPS_API_KEY'];
    if (!lovableKey || !mapsKey) throw new Error("A busca de eletropostos não está configurada.");

    const response = await fetch(
      "https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchNearby",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
          "Content-Type": "application/json",
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount",
        },
        body: JSON.stringify({
          includedTypes: ["electric_vehicle_charging_station"],
          maxResultCount: 20,
          rankPreference: "DISTANCE",
          locationRestriction: {
            circle: { center: data, radius: 15000 },
          },
          languageCode: "pt-BR",
          regionCode: "BR",
        }),
      },
    );

    if (response.status === 403) {
      const body = await response.json() as { error?: { details?: Array<{ reason?: string }> } };
      const reason = body.error?.details?.find((detail) => detail.reason)?.reason;
      if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") throw new Error("A chave do Google Maps precisa permitir chamadas do servidor.");
      if (reason === "API_KEY_SERVICE_BLOCKED") throw new Error("A Places API precisa ser liberada na chave do Google Maps.");
      throw new Error("O Google Maps recusou a busca de eletropostos.");
    }
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Google Maps request failed [${response.status}]: ${errorBody}`);
      throw new Error("Não foi possível buscar eletropostos agora.");
    }

    const result = await response.json() as { places?: GooglePlace[] };
    return (result.places ?? []).flatMap((place) => {
      const latitude = place.location?.latitude;
      const longitude = place.location?.longitude;
      if (!place.id || latitude === undefined || longitude === undefined) return [];
      return [{
        id: place.id,
        name: place.displayName?.text ?? "Eletroposto",
        address: place.formattedAddress ?? "Endereço não informado",
        latitude,
        longitude,
        rating: place.rating ?? null,
        ratingCount: place.userRatingCount ?? 0,
      }];
    });
  });