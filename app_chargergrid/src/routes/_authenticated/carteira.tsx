
import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Wallet,
  Award,
  History,
  PlusCircle,
  Loader2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/carteira")({
  component: CarteiraPage,
});

type WalletData = {
  customer_id: number;
  loyalty_member: boolean;
  balance: {
    paid: number;
    bonus: number;
    total: number;
    bonus_expiring_7d: number;
  };
  tier: {
    key: string;
    name: string;
    cashback_pct: number;
    kwh_30d: number;
    progress_pct: number;
    next_tier: {
      name: string;
      missing_kwh: number;
    } | null;
  };
  earned: {
    gridback: number;
    topup_bonus: number;
  };
  transactions: {
    id: number;
    type: string;
    amount: number;
    description: string | null;
    created_at: string;
  }[];
};

const formatMoney = (value: number) =>
  Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function CarteiraPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

const [customerId, setCustomerId] = useState<number | null>(null);

const [topupAmount, setTopupAmount] = useState(100);
const [customAmount, setCustomAmount] = useState("");
const [topupMethod, setTopupMethod] =
  useState<"pix" | "credit" | "debit">("pix");

const [topupLoading, setTopupLoading] = useState(false);
const [topupMessage, setTopupMessage] = useState("");
const [topupError, setTopupError] = useState("");
const [retryPending, setRetryPending] = useState(false);

const submittingRef = useRef(false);

const pendingTopup = useRef<{
  amount: number;
  payment_method: "pix" | "credit" | "debit";
  idempotency_key: string;
} | null>(null);


  useEffect(() => {
    let active = true;

    async function carregarCarteira() {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !authData.user) {
          throw new Error("Você precisa estar conectado.");
        }

        const { data: customer, error: customerError } =
          await supabase
            .from("customers")
            .select("id")
            .eq("auth_user_id", authData.user.id)
            .maybeSingle();

        if (customerError || !customer) {
          throw new Error("Cliente não encontrado.");
        }
        if (active) {
          setCustomerId(customer.id);
        }

        const response = await fetch(
          `http://localhost:8000/api/wallet/${customer.id}`
        );

        if (!response.ok) {
          throw new Error("Não foi possível consultar a carteira.");
        }

        const result: WalletData = await response.json();

        if (active) {
          setWallet(result);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Erro ao carregar carteira."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregarCarteira();

    return () => {
      active = false;
    };
  }, []);


  async function handleTopup() {
    // Impede dois cliques quase simultaneos.
    if (submittingRef.current) return;

    if (!customerId || !wallet?.loyalty_member) {
      setTopupError("Carteira não disponível para esta conta.");
      return;
    }
    if (
      !Number.isFinite(topupAmount) ||
      topupAmount < 10 ||
      topupAmount > 1000 ||
      Math.abs(topupAmount * 100 - Math.round(topupAmount * 100)) > 0.000001
    ) {
      setTopupError(
        "Digite um valor entre R$ 10,00 e R$ 1.000,00, com até 2 casas decimais."
      );
      return;
    }

    submittingRef.current = true;
    setTopupLoading(true);
    setTopupError("");
    setTopupMessage("");

    try {
      // Consulta a sessao atual do Supabase.
      const { data, error: authError } =
        await supabase.auth.getSession();

      if (authError || !data.session?.access_token) {
        throw new Error("Faça login novamente para adicionar saldo.");
      }

      // Uma chave nova para uma operacao nova.
      // Em uma tentativa repetida, reutilizamos a chave anterior.
      if (!pendingTopup.current) {
        pendingTopup.current = {
          amount: topupAmount,
          payment_method: topupMethod,
          idempotency_key: crypto.randomUUID(),
        };
      }

      const operation = pendingTopup.current;

      const response = await fetch(
        `http://localhost:8000/api/wallet/${customerId}/topup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify(operation),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : "Erro ao adicionar saldo."
        );
      }

      // O backend devolve a carteira atualizada.
      setWallet(result.wallet);

      setTopupMessage(
        result.already_processed
          ? "Esta operação já foi processada. Nenhum crédito duplicado."
          : `Créditos adicionados: R$ ${Number(
              result.credited
            ).toFixed(2)} + bônus de R$ ${Number(
              result.bonus
            ).toFixed(2)}.`
      );

      // Somente apos confirmacao limpamos a chave.
      pendingTopup.current = null;
      setRetryPending(false);

    } catch (err) {
      console.error("Erro ao adicionar saldo:", err);

      setTopupError(
        err instanceof Error
          ? err.message
          : "Não foi possível adicionar saldo."
      );

      // Mantem a operacao para uma tentativa segura.
      if (pendingTopup.current) {
        setRetryPending(true);
      }

    } finally {
      submittingRef.current = false;
      setTopupLoading(false);
    }
  }


  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">

        <div className="flex items-center gap-3">
          <Wallet className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">
              Minha Carteira
            </h1>
            <p className="text-sm text-muted-foreground">
              Cartão Grid e programa GridBack
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2">
            <Loader2 className="animate-spin" />
            Carregando carteira...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500 p-4 text-red-400">
            {error}
          </div>
        )}

        {wallet && (
          <>
            <div className="rounded-2xl border border-primary bg-card p-6">
              <p className="text-sm text-muted-foreground">
                Saldo disponível
              </p>

              <h2 className="mt-2 text-4xl font-bold text-primary">
                {formatMoney(wallet.balance.total)}
              </h2>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Saldo pago
                  </p>
                  <p className="font-semibold">
                    {formatMoney(wallet.balance.paid)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Saldo bônus
                  </p>
                  <p className="font-semibold">
                    {formatMoney(wallet.balance.bonus)}
                  </p>
                </div>
              </div>


              <div className="mt-6 space-y-4 border-t border-border pt-5">
                <h3 className="font-bold">
                  Adicionar créditos
                </h3>

                <p className="text-xs text-muted-foreground">
                  Créditos fictícios para demonstração acadêmica.
                  Nenhum pagamento real será realizado.
                </p>


                <div className="space-y-3">
                  {/* Valores prontos */}
                  <div className="grid grid-cols-3 gap-2">
                    {[50, 100, 200].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        disabled={topupLoading || retryPending}
                        onClick={() => {
                          setTopupAmount(amount);
                          setCustomAmount("");
                          setTopupError("");
                          setTopupMessage("");
                        }}
                        className={`rounded-xl border px-2 py-3 text-sm font-semibold ${
                          customAmount === "" && topupAmount === amount
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary"
                        }`}
                      >
                        R$ {amount}
                      </button>
                    ))}
                  </div>

                  {/* Valor personalizado */}
                  <div>
                    <label
                      htmlFor="custom-topup"
                      className="mb-2 block text-sm font-medium"
                    >
                      Ou digite outro valor
                    </label>

                    <div className="flex items-center rounded-xl border border-border bg-background px-4">
                      <span className="text-muted-foreground">R$</span>

                      <input
                        id="custom-topup"
                        type="text"
                        inputMode="decimal"
                        placeholder="Ex: 75,50"
                        value={customAmount}
                        disabled={topupLoading || retryPending}
                        onChange={(event) => {
                          const value = event.target.value;

                          // Aceita números com até duas casas decimais
                          if (!/^\d{0,4}([.,]\d{0,2})?$/.test(value)) {
                            return;
                          }

                          setCustomAmount(value);
                          setTopupAmount(
                            value === "" ? 0 : Number(value.replace(",", "."))
                          );
                          setTopupError("");
                          setTopupMessage("");
                        }}
                        className="w-full bg-transparent px-3 py-3 outline-none"
                      />
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Valor mínimo R$ 10,00 e máximo R$ 1.000,00.
                    </p>
                  </div>
                </div>


                <label className="block space-y-2">
                  <span className="text-sm font-medium">
                    Método de pagamento simulado
                  </span>

                  <select
                    value={topupMethod}
                    disabled={topupLoading || retryPending}
                    onChange={(event) => {
                      setTopupMethod(
                        event.target.value as "pix" | "credit" | "debit"
                      );
                      setTopupError("");
                      setTopupMessage("");
                    }}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3"
                  >
                    <option value="pix">PIX</option>
                    <option value="credit">Cartão de crédito</option>
                    <option value="debit">Cartão de débito</option>
                  </select>
                </label>

                {retryPending && (
                  <p className="text-xs text-amber-500">
                    A solicitação anterior não foi confirmada.
                    Tente novamente para consultar ou concluir
                    a mesma operação, sem duplicar créditos.
                  </p>
                )}

                <button
                  type="button"
                  disabled={topupLoading || !wallet.loyalty_member}
                  onClick={() => void handleTopup()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {topupLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <PlusCircle size={18} />
                  )}

                  {topupLoading
                    ? "Processando..."
                    : retryPending
                      ? "Tentar novamente"
                      : `Adicionar R$ ${topupAmount}`}
                </button>

                {topupError && (
                  <p role="alert" className="text-sm text-red-400">
                    {topupError}
                  </p>
                )}

                {topupMessage && (
                  <p role="status" className="text-sm text-green-500">
                    {topupMessage}
                  </p>
                )}
              </div>

            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <Award className="text-primary" />
                <h2 className="text-lg font-bold">
                  Nível {wallet.tier.name}
                </h2>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                {wallet.tier.kwh_30d} kWh nos últimos 30 dias
              </p>

              <p className="mt-3 text-xl font-bold text-primary">
                {wallet.tier.cashback_pct}% de GridBack
              </p>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${wallet.tier.progress_pct}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                {wallet.tier.next_tier
                  ? `Faltam ${wallet.tier.next_tier.missing_kwh} kWh para o nível ${wallet.tier.next_tier.name}`
                  : "Você alcançou o nível máximo!"}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <History className="text-primary" />
                <h2 className="text-lg font-bold">
                  Últimas movimentações
                </h2>
              </div>

              {wallet.transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma movimentação registrada ainda.
                </p>
              ) : (
                <div className="space-y-3">
                  {wallet.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-3 border-b border-border pb-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {tx.description || tx.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>

                      <span
                        className={
                          tx.amount >= 0
                            ? "font-bold text-green-500"
                            : "font-bold text-red-400"
                        }
                      >
                        {tx.amount > 0 ? "+" : ""}
                        {formatMoney(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
