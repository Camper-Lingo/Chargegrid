import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Car, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { ChargingFlow } from "@/components/charging-flow";
import type { TariffPeriod, Vehicle } from "@/lib/charging";

export const Route = createFileRoute("/_authenticated/carregar")({
  head: () => ({ meta: [
    { title: "Carregar — ChargeGrid" },
    { name: "description", content: "Escolha quanto carregar e veja energia, tempo e preço antes de começar." },
    { property: "og:title", content: "Carregar — ChargeGrid" },
    { property: "og:description", content: "Simule sua recarga com preço transparente." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CarregarPage,
});

function CarregarPage() {
  const { data: vehicle, isLoading } = useQuery({
    queryKey: ["vehicle"],
    queryFn: async () => {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        return null;
      } 

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (customerError || !customer) {
    console.error("Erro ao buscar customer:", customerError);
    return null;
  }

  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("customer_id", customer.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar veículo:", error);
    return null;
  }

  return (data as Vehicle | null) ?? null;
  },
  });

  const { data: tariffs } = useQuery({
    queryKey: ["tariffs"],
    queryFn: async () => {
      const { data } = await supabase.from("tariff_periods").select("*").order("starts_at");
      return (data ?? []) as TariffPeriod[];
    },
  });

  return (
    <AppShell>
      {isLoading ? null : !vehicle ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Car className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Cadastre seu veículo primeiro</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Precisamos da capacidade da bateria para calcular energia e preço da recarga.
          </p>
          <Link
            to="/veiculo"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            Cadastrar veículo
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <ChargingFlow vehicle={vehicle} tariffs={tariffs ?? []} />
      )}
    </AppShell>
  );
}
