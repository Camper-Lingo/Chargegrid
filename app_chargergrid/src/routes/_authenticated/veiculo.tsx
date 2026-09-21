import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, Check, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ELECTRIC_VEHICLES } from "@/lib/electric-vehicles";

export const Route = createFileRoute("/_authenticated/veiculo")({
  head: () => ({
    meta: [
      {
        title: "Meus veículos — ChargeGrid",
      },
      {
        name: "description",
        content:
          "Cadastre e gerencie seus veículos elétricos.",
      },
      {
        property: "og:title",
        content: "Meus veículos — ChargeGrid",
      },
      {
        property: "og:description",
        content:
          "Configure seus veículos elétricos no ChargeGrid.",
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

  component: VehiclePage,
});

type Vehicle = {
  id: number;
  customer_id: number;
  model: string;
  battery_capacity_kwh: number;
  current_battery_pct: number;
  max_charge_power_kw: number | null;
  is_active: boolean;
};

function VehiclePage() {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("60");
  const [currentBattery, setCurrentBattery] =
    useState("20");
  const [power, setPower] = useState("22");

  const [saving, setSaving] = useState(false);
  const [activatingId, setActivatingId] =
    useState<number | null>(null);
  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  /*
   * BUSCA TODOS OS VEÍCULOS
   */
  const {
    data: vehicles = [],
    isLoading,
  } = useQuery({
    queryKey: ["vehicles"],

    queryFn: async () => {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error(
          "Usuário não autenticado.",
        );
      }

      const {
        data: customer,
        error: customerError,
      } = await supabase
        .from("customers")
        .select("id")
        .eq(
          "auth_user_id",
          authData.user.id,
        )
        .maybeSingle();

      if (customerError) {
        console.error(
          "Erro ao buscar customer:",
          customerError,
        );

        throw customerError;
      }

      if (!customer) {
        throw new Error(
          "Cadastro de cliente não encontrado.",
        );
      }

      const {
        data,
        error,
      } = await supabase
        .from("vehicles")
        .select("*")
        .eq(
          "customer_id",
          customer.id,
        )
        .order("is_active", {
          ascending: false,
        })
        .order("id", {
          ascending: true,
        });

      if (error) {
        console.error(
          "Erro ao buscar veículos:",
          error,
        );

        throw error;
      }

      return (data ?? []) as Vehicle[];
    },
  });

  /*
   * AO ABRIR A PÁGINA,
   * PREENCHE O FORMULÁRIO COM O VEÍCULO ATIVO
   */
  useEffect(() => {
    const activeVehicle = vehicles.find(
      (vehicle) => vehicle.is_active,
    );

    if (!activeVehicle) {
      return;
    }

    setName(activeVehicle.model);

    setCapacity(
      String(
        activeVehicle.battery_capacity_kwh,
      ),
    );

    setCurrentBattery(
      String(
        activeVehicle.current_battery_pct,
      ),
    );

    setPower(
      String(
        activeVehicle.max_charge_power_kw ?? 22,
      ),
    );
  }, [vehicles]);

  /*
   * SALVAR NOVO VEÍCULO
   */
  async function save(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(
        "Informe o modelo do veículo.",
      );
      return;
    }

    const capacityValue =
      Number(capacity);

    const currentBatteryValue =
      Number(currentBattery);

    const powerValue =
      Number(power);

    if (
      !Number.isFinite(capacityValue) ||
      capacityValue <= 0
    ) {
      toast.error(
        "Informe uma capacidade de bateria válida.",
      );
      return;
    }

    if (
      !Number.isFinite(currentBatteryValue) ||
      currentBatteryValue < 0 ||
      currentBatteryValue > 100
    ) {
      toast.error(
        "A bateria atual deve estar entre 0% e 100%.",
      );
      return;
    }

    if (
      !Number.isFinite(powerValue) ||
      powerValue <= 0
    ) {
      toast.error(
        "Informe uma potência válida.",
      );
      return;
    }

    setSaving(true);

    try {
      /*
       * Usuário logado
       */
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (
        authError ||
        !authData.user
      ) {
        toast.error(
          "Sua sessão expirou. Entre novamente.",
        );
        return;
      }

      /*
       * Customer
       */
      const {
        data: customer,
        error: customerError,
      } = await supabase
        .from("customers")
        .select("id")
        .eq(
          "auth_user_id",
          authData.user.id,
        )
        .maybeSingle();

      if (customerError) {
        console.error(
          "Erro ao buscar customer:",
          customerError,
        );

        toast.error(
          "Não foi possível encontrar seu cadastro.",
        );

        return;
      }

      if (!customer) {
        toast.error(
          "Seu cadastro de cliente não foi encontrado.",
        );

        return;
      }

      /*
       * Se ainda não existe nenhum veículo,
       * esse será automaticamente o ativo.
       */
      const shouldBeActive =
        vehicles.length === 0;

      /*
       * Se for o primeiro veículo,
       * ele será ativo.
       *
       * Caso já existam veículos,
       * o novo começa como inativo.
       */
      const {
        error: insertError,
      } = await supabase
        .from("vehicles")
        .insert({
          customer_id:
            customer.id,

          model:
            name.trim(),

          battery_capacity_kwh:
            capacityValue,

          current_battery_pct:
            currentBatteryValue,

          max_charge_power_kw:
            powerValue,

          is_active:
            shouldBeActive,
        });

      if (insertError) {
        console.error(
          "Erro ao salvar veículo:",
          insertError,
        );

        toast.error(
          `Não foi possível salvar o veículo: ${insertError.message}`,
        );

        return;
      }

      /*
       * Limpa o formulário
       */
      setName("");
      setCapacity("60");
      setCurrentBattery("20");
      setPower("22");

      /*
       * Atualiza a lista
       */
      await queryClient.invalidateQueries({
        queryKey: ["vehicles"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["vehicle"],
      });

      toast.success(
        shouldBeActive
          ? "Veículo salvo e definido como ativo."
          : "Veículo salvo com sucesso.",
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * ATIVAR VEÍCULO
   */
  async function activateVehicle(
    vehicleId: number,
  ) {
    setActivatingId(vehicleId);

    try {
      /*
       * Primeiro desativa TODOS os veículos.
       *
       * Isso garante que nunca existam
       * dois veículos ativos ao mesmo tempo.
       */
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (
        authError ||
        !authData.user
      ) {
        throw new Error(
          "Usuário não autenticado.",
        );
      }

      const {
        data: customer,
        error: customerError,
      } = await supabase
        .from("customers")
        .select("id")
        .eq(
          "auth_user_id",
          authData.user.id,
        )
        .maybeSingle();

      if (customerError) {
        throw customerError;
      }

      if (!customer) {
        throw new Error(
          "Cliente não encontrado.",
        );
      }

      /*
       * Desativa todos
       */
      const {
        error: deactivateError,
      } = await supabase
        .from("vehicles")
        .update({
          is_active: false,
        })
        .eq(
          "customer_id",
          customer.id,
        );

      if (deactivateError) {
        throw deactivateError;
      }

      /*
       * Ativa o escolhido
       */
      const {
        error: activateError,
      } = await supabase
        .from("vehicles")
        .update({
          is_active: true,
        })
        .eq(
          "id",
          vehicleId,
        )
        .eq(
          "customer_id",
          customer.id,
        );

      if (activateError) {
        throw activateError;
      }

      await queryClient.invalidateQueries({
        queryKey: ["vehicles"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["vehicle"],
      });

      toast.success(
        "Veículo selecionado como ativo.",
      );
    } catch (error) {
      console.error(
        "Erro ao ativar veículo:",
        error,
      );

      toast.error(
        "Não foi possível selecionar o veículo.",
      );
    } finally {
      setActivatingId(null);
    }
  }

  /*
   * EXCLUIR VEÍCULO
   */
  async function deleteVehicle(vehicle: Vehicle) {
  setDeletingId(vehicle.id);

  try {
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      throw new Error("Usuário não autenticado.");
    }

    const { data: customer, error: customerError } =
      await supabase
        .from("customers")
        .select("id")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();

    if (customerError) {
      throw customerError;
    }

    if (!customer) {
      throw new Error("Cliente não encontrado.");
    }

    // DELETE REAL NO SUPABASE
    const { data: deletedVehicles, error: deleteError } =
      await supabase
        .from("vehicles")
        .delete()
        .eq("id", vehicle.id)
        .eq("customer_id", customer.id)
        .select("id");

    if (deleteError) {
      if (deleteError) {
  console.error("ERRO DO SUPABASE:", {
    message: deleteError.message,
    details: deleteError.details,
    hint: deleteError.hint,
    code: deleteError.code,
  });

  throw deleteError;
}
      throw deleteError;
    }

    // Se nenhuma linha foi retornada, o DELETE não aconteceu
    if (!deletedVehicles || deletedVehicles.length === 0) {
      throw new Error(
        "O Supabase não permitiu excluir este veículo."
      );
    }

    // Remove imediatamente o quadradinho da tela
    queryClient.setQueryData<Vehicle[]>(
      ["vehicles"],
      (oldVehicles = []) =>
        oldVehicles.filter(
          (item) => item.id !== vehicle.id
        )
    );

    /*
     * Se excluímos o veículo ativo,
     * escolhemos outro como ativo.
     */
    if (vehicle.is_active) {
      const nextVehicle = vehicles.find(
        (item) => item.id !== vehicle.id
      );

      if (nextVehicle) {
        const { error: activateError } =
          await supabase
            .from("vehicles")
            .update({
              is_active: true,
            })
            .eq("id", nextVehicle.id)
            .eq("customer_id", customer.id);

        if (activateError) {
          console.error(
            "Erro ao ativar próximo veículo:",
            activateError
          );
        }
      }
    }

    // Sincroniza novamente com Supabase
    await queryClient.invalidateQueries({
      queryKey: ["vehicles"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["vehicle"],
    });

    toast.success("Veículo excluído.");
  } catch (error) {
    console.error("ERRO AO EXCLUIR:", error);

    toast.error(
      error instanceof Error
        ? error.message
        : "Não foi possível excluir o veículo."
    );
  } finally {
    setDeletingId(null);
  }
}

  /*
   * CARREGANDO
   */
  if (isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  /*
   * TELA
   */
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">

        {/* CABEÇALHO */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-primary">
            <Car />
          </div>

          <div>
            <h1 className="text-2xl font-bold">
              Meus veículos
            </h1>

            <p className="text-sm text-muted-foreground">
              Cadastre e gerencie seus veículos elétricos.
            </p>
          </div>
        </div>

        {/* FORMULÁRIO */}
        <form
          onSubmit={save}
          className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6"
        >
          <div className="space-y-2">
            <Label htmlFor="name">
              Modelo do veículo
            </Label>

            <Input
              id="name"
              list="electric-vehicle-models"
              required
              autoComplete="off"
              value={name}
              onChange={(e) => {
                const nextName =
                  e.target.value;

                setName(nextName);

                const match =
                  ELECTRIC_VEHICLES.find(
                    (model) =>
                      model.name.toLocaleLowerCase(
                        "pt-BR",
                      ) ===
                      nextName.toLocaleLowerCase(
                        "pt-BR",
                      ),
                  );

                if (match) {
                  setCapacity(
                    String(
                      match.batteryKwh,
                    ),
                  );

                  setPower(
                    String(
                      match.maxChargeKw,
                    ),
                  );
                }
              }}
              placeholder="Ex.: BYD Dolphin"
            />

            <datalist id="electric-vehicle-models">
              {ELECTRIC_VEHICLES.map(
                (model) => (
                  <option
                    key={model.name}
                    value={model.name}
                  >
                    {model.batteryKwh} kWh ·{" "}
                    {model.maxChargeKw} kW
                  </option>
                ),
              )}
            </datalist>

            <p className="text-xs text-muted-foreground">
              Selecione uma sugestão para preencher os dados automaticamente.
            </p>
          </div>

          {/* BATERIA */}
          <div className="grid gap-4 sm:grid-cols-3">

            <div className="space-y-2">
              <Label htmlFor="capacity">
                Bateria (kWh)
              </Label>

              <Input
                id="capacity"
                required
                type="number"
                min="1"
                step="0.1"
                value={capacity}
                onChange={(e) =>
                  setCapacity(
                    e.target.value,
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-battery">
                Bateria atual (%)
              </Label>

              <Input
                id="current-battery"
                required
                type="number"
                min="0"
                max="100"
                step="1"
                value={currentBattery}
                onChange={(e) => {
                  const value =
                    Number(
                      e.target.value,
                    );

                  if (
                    value > 100
                  ) {
                    setCurrentBattery(
                      "100",
                    );
                  } else if (
                    value < 0
                  ) {
                    setCurrentBattery(
                      "0",
                    );
                  } else {
                    setCurrentBattery(
                      e.target.value,
                    );
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="power">
                Potência máxima (kW)
              </Label>

              <Input
                id="power"
                required
                type="number"
                min="1"
                step="0.1"
                value={power}
                onChange={(e) =>
                  setPower(
                    e.target.value,
                  )
                }
              />
            </div>

          </div>

          <Button
            type="submit"
            className="h-11 w-full"
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save />
            )}

            {saving
              ? "Salvando..."
              : "Salvar veículo"}
          </Button>
        </form>

        {/* VEÍCULOS SALVOS */}
        <div className="mt-8">

          <h2 className="text-lg font-bold">
            Veículos salvos
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Escolha qual veículo está sendo utilizado atualmente.
          </p>

          {vehicles.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center">
              <Car className="mx-auto h-8 w-8 text-muted-foreground" />

              <p className="mt-3 text-sm text-muted-foreground">
                Nenhum veículo cadastrado ainda.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">

              {vehicles.map(
                (vehicle) => (
                  <div
                    key={vehicle.id}
                    className={`rounded-xl border bg-card p-5 transition ${
                      vehicle.is_active
                        ? "border-primary ring-1 ring-primary/20"
                        : "border-border"
                    }`}
                  >

                    {/* TOPO DO CARD */}
                    <div className="flex items-start justify-between gap-4">

                      <div className="flex items-start gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                          <Car className="h-5 w-5" />
                        </div>

                        <div>
                          <h3 className="font-bold">
                            {vehicle.model}
                          </h3>

                          {vehicle.is_active ? (
                            <div className="mt-1 flex items-center gap-1 text-sm font-medium text-primary">
                              <Check className="h-4 w-4" />
                              Veículo utilizado
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-muted-foreground">
                              Veículo salvo
                            </p>
                          )}
                        </div>

                      </div>

                      {vehicle.is_active && (
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                          ATIVO
                        </span>
                      )}

                    </div>

                    {/* INFORMAÇÕES */}
                    <div className="mt-4 grid grid-cols-3 gap-3">

                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xs text-muted-foreground">
                          Bateria
                        </p>

                        <p className="mt-1 font-semibold">
                          {
                            Number(
                              vehicle.battery_capacity_kwh,
                            )
                          }{" "}
                          kWh
                        </p>
                      </div>

                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xs text-muted-foreground">
                          Atual
                        </p>

                        <p className="mt-1 font-semibold">
                          {
                            Number(
                              vehicle.current_battery_pct,
                            )
                          }%
                        </p>
                      </div>

                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xs text-muted-foreground">
                          Potência
                        </p>

                        <p className="mt-1 font-semibold">
                          {vehicle.max_charge_power_kw
                            ? Number(
                                vehicle.max_charge_power_kw,
                              )
                            : 0}{" "}
                          kW
                        </p>
                      </div>

                    </div>

                    {/* BOTÕES */}
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">

                      {!vehicle.is_active && (
                        <Button
                          className="flex-1"
                          disabled={
                            activatingId ===
                            vehicle.id
                          }
                          onClick={() =>
                            activateVehicle(
                              vehicle.id,
                            )
                          }
                        >
                          {activatingId ===
                          vehicle.id ? (
                            <>
                              <Loader2 className="animate-spin" />
                              Ativando...
                            </>
                          ) : (
                            <>
                              <Check />
                              Usar este veículo
                            </>
                          )}
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        className={
                          vehicle.is_active
                            ? "flex-1"
                            : ""
                        }
                        disabled={
                          deletingId ===
                          vehicle.id
                        }
                        onClick={() =>
                          deleteVehicle(
                            vehicle,
                          )
                        }
                      >
                        {deletingId ===
                        vehicle.id ? (
                          <>
                            <Loader2 className="animate-spin" />
                            Excluindo...
                          </>
                        ) : (
                          <>
                            <Trash2 />
                            Excluir
                          </>
                        )}
                      </Button>

                    </div>

                  </div>
                ),
              )}

            </div>
          )}

        </div>
      </div>
    </AppShell>
  );
}
