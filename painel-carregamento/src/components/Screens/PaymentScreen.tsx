import { useEffect,useState } from 'react';
import {
  Check,
  CheckCircle2,
  CreditCard,
  Wallet,
  Loader2,
  QrCode,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface PaymentScreenProps {
  sessionId: number;
  customerId: number;
  totalCost: number;
  energyUsed: number;
  duration: number;
  onFinish: () => void;
  onApproved: () => void;
  onExit: () => void;
}

type PaymentMethod = 'pix' | 'card' | 'wallet';


interface WalletData {
  customer_id: number;
  loyalty_member: boolean;
  balance: {
    paid: number;
    bonus: number;
    total: number;
  };
  tier: {
    key: string;
    name: string;
    cashback_pct: number;
  };
}


export const PaymentScreen = ({
  sessionId,
  customerId,
  totalCost,
  energyUsed,
  duration,
  onFinish,
  onApproved,
  onExit,
}: PaymentScreenProps) => {
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState('');

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState(false);

  useEffect(() => {
    let active = true;

    const carregarCarteira = async () => {
      setWalletLoading(true);
      setWalletError(false);

      try {
        const response = await fetch(
          `http://localhost:8000/api/wallet/${customerId}`
        );

        if (!response.ok) {
          throw new Error('Erro ao consultar carteira');
        }

        const data: WalletData = await response.json();

        if (active) {
          setWallet(data);
        }
      } catch (err) {
        console.error('Erro no Cartao Grid:', err);

        if (active) {
          setWallet(null);
          setWalletError(true);
        }
      } finally {
        if (active) {
          setWalletLoading(false);
        }
      }
    };

    void carregarCarteira();

    return () => {
      active = false;
    };
  }, [customerId]);

  const walletEnough =
    wallet?.loyalty_member === true &&
    wallet.balance.total >= totalCost;


  const formatMoney = (value: number) =>
    value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

  const handlePayment = async () => {

    if (loading) return;

    if (method === 'wallet' && !walletEnough) {
      setError('Saldo insuficiente no Cartão Grid.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `http://localhost:8000/api/payments?session_id=${sessionId}&customer_id=${customerId}&payment_method=${method}`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail || 'Falha ao processar pagamento');
      }

      await response.json();
      setApproved(true);
      onApproved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao processar pagamento'
      );
    } finally {
      setLoading(false);
    }
  };


if (approved) {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-2">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden rounded-[28px] border border-[#303030] bg-[#202020] p-7 shadow-2xl">

          <div className="absolute -top-24 -right-24 h-52 w-52 rounded-full bg-green-500/10 blur-3xl" />

          <div className="relative text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-green-400/30 bg-green-400/10">
              <CheckCircle2
                size={42}
                className="text-green-400"
              />
            </div>

            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-green-400">
              Pagamento confirmado
            </p>

            <h1 className="text-3xl font-bold text-white">
              Tudo certo!
            </h1>

            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[#999]">
              Sua recarga foi concluída e o pagamento foi
              aprovado com sucesso.
            </p>

            <div className="my-7 rounded-2xl border border-[#343434] bg-[#181818] p-5">
              <p className="text-sm text-[#888]">
                Valor pago
              </p>

              <p className="mt-1 text-4xl font-bold tracking-tight text-white">
                {formatMoney(totalCost)}
              </p>

              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[#aaa]">
                {method === 'wallet' ? (
                  <Wallet size={16} />
                ) : method === 'pix' ? (
                  <QrCode size={16} />
                ) : (
                  <CreditCard size={16} />
                )}

                {method === 'wallet'
                  ? 'Pagamento com Cartão Grid'
                  : method === 'pix'
                    ? 'Pagamento via PIX'
                    : 'Pagamento via cartão'}
              </div>
            </div>

            {/* Botões após pagamento aprovado */}
            <div className="grid grid-cols-2 gap-3">

              <button
                id="finish-payment-btn"
                type="button"
                onClick={onFinish}
                className="rounded-2xl bg-[#1E90FF] px-3 py-4 text-sm font-bold text-white transition-all hover:bg-[#1878D1] active:scale-[0.98]"
              >
                Voltar ao menu
              </button>

              <button
                id="exit-payment-btn"
                type="button"
                onClick={onExit}
                className="rounded-2xl border border-red-500/40 bg-red-500/10 px-3 py-4 text-sm font-bold text-red-400 transition-all hover:bg-red-500/20 active:scale-[0.98]"
              >
                Sair
              </button>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}


  return (
    <div className="min-h-[75vh] flex items-center justify-center px-2 py-4">
      <div className="w-full max-w-md">

        {/* Cabeçalho */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1E90FF]/15">
            <Zap
              size={28}
              className="text-[#1E90FF]"
              fill="currentColor"
            />
          </div>

          <p className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-[#1E90FF]">
            ChargeGrid
          </p>

          <h1 className="text-2xl font-bold text-white">
            Recarga concluída
          </h1>

          <p className="mt-2 text-sm text-[#999]">
            Confira o resumo e escolha como deseja pagar
          </p>
        </div>

        {/* Card principal */}
        <div className="overflow-hidden rounded-[28px] border border-[#303030] bg-[#222] shadow-2xl">

          {/* Resumo */}
          <div className="p-6">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-[#777]">
              Resumo da recarga
            </p>

            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-2xl bg-[#191919] p-4">
                <p className="text-xs text-[#777]">
                  Energia
                </p>

                <p className="mt-1 text-lg font-bold text-white">
                  {energyUsed.toFixed(1)}
                  <span className="ml-1 text-sm font-normal text-[#888]">
                    kWh
                  </span>
                </p>
              </div>

              <div className="rounded-2xl bg-[#191919] p-4">
                <p className="text-xs text-[#777]">
                  Duração
                </p>

                <p className="mt-1 text-lg font-bold text-white">
                  {duration}
                  <span className="ml-1 text-sm font-normal text-[#888]">
                    min
                  </span>
                </p>
              </div>
            </div>

            {/* Valor */}
            <div className="mt-4 flex items-end justify-between border-t border-[#343434] pt-5">
              <div>
                <p className="text-sm text-[#888]">
                  Total da recarga
                </p>

                <p className="mt-1 text-xs text-[#666]">
                  Tarifa calculada automaticamente
                </p>
              </div>

              <p className="text-3xl font-bold tracking-tight text-white">
                {formatMoney(totalCost)}
              </p>
            </div>
          </div>

          {/* Pagamento */}
          <div className="border-t border-[#303030] bg-[#1C1C1C] p-6">
            <p className="mb-4 text-sm font-semibold text-white">
              Forma de pagamento
            </p>

            {/* CARTAO GRID */}
            {(
              <button
                type="button"
                disabled={walletLoading || walletError || !walletEnough || loading}
                onClick={() => {
                  setMethod('wallet');
                  setError('');
                }}
                className={`mb-3 flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                  !walletEnough
                    ? 'cursor-not-allowed border-[#383838] bg-[#242424] opacity-60'
                    : method === 'wallet'
                      ? 'border-[#1E90FF] bg-[#1E90FF]/10'
                      : 'border-[#383838] bg-[#242424] hover:border-[#555]'
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#303030]">
                  <Wallet size={24} className="text-[#1E90FF]" />
                </div>

                <div className="flex-1">
                  <p className="font-bold text-white">
                    Cartão Grid
                  </p>


                  <p className="mt-1 text-sm text-[#aaa]">
                    {walletLoading
                      ? "Consultando saldo..."
                      : walletError
                        ? "Saldo indisponível"
                        : wallet?.loyalty_member
                          ? `Saldo: ${Number(wallet.balance.total).toLocaleString(
                              "pt-BR",
                              { style: "currency", currency: "BRL" }
                            )}`
                          : "Disponível para clientes cadastrados"}
                  </p>


                  {!walletLoading && wallet?.loyalty_member && !walletEnough && (
                    <p className="mt-1 text-xs text-red-400">
                      Saldo insuficiente
                    </p>
                  )}
                </div>

                {method === 'wallet' && walletEnough && (
                  <CheckCircle2 size={22} className="text-[#1E90FF]" />
                )}
              </button>
            )}

            {walletLoading && (
              <p className="mb-3 text-xs text-[#888]">
                Consultando saldo do Cartão Grid...
              </p>
            )}

            {walletError && (
              <p className="mb-3 text-xs text-[#888]">
                Carteira indisponível. Utilize PIX ou cartão.
              </p>
            )}


            <div className="grid grid-cols-2 gap-3">

              {/* PIX */}
              <button
                type="button"
                onClick={() => setMethod('pix')}
                className={`relative rounded-2xl border p-4 text-left transition-all ${
                  method === 'pix'
                    ? 'border-[#1E90FF] bg-[#1E90FF]/10'
                    : 'border-[#383838] bg-[#242424] hover:border-[#555]'
                }`}
              >
                {method === 'pix' && (
                  <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#1E90FF]">
                    <Check size={13} strokeWidth={3} />
                  </div>
                )}

                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#303030]">
                  <QrCode
                    size={21}
                    className={
                      method === 'pix'
                        ? 'text-[#1E90FF]'
                        : 'text-[#bbb]'
                    }
                  />
                </div>

                <p className="font-bold text-white">
                  PIX
                </p>

                <p className="mt-1 text-xs text-[#777]">
                  Aprovação imediata
                </p>
              </button>

              {/* Cartão */}
              <button
                type="button"
                onClick={() => setMethod('card')}
                className={`relative rounded-2xl border p-4 text-left transition-all ${
                  method === 'card'
                    ? 'border-[#1E90FF] bg-[#1E90FF]/10'
                    : 'border-[#383838] bg-[#242424] hover:border-[#555]'
                }`}
              >
                {method === 'card' && (
                  <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#1E90FF]">
                    <Check size={13} strokeWidth={3} />
                  </div>
                )}

                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#303030]">
                  <CreditCard
                    size={21}
                    className={
                      method === 'card'
                        ? 'text-[#1E90FF]'
                        : 'text-[#bbb]'
                    }
                  />
                </div>

                <p className="font-bold text-white">
                  Cartão
                </p>

                <p className="mt-1 text-xs text-[#777]">
                  Crédito ou débito
                </p>
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Botão pagar */}
            <button
              id="pay-charge-btn"
              onClick={handlePayment}
              disabled={loading || (method === 'wallet' && !walletEnough)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1E90FF] py-4 font-bold text-white shadow-lg shadow-blue-500/10 transition-all hover:bg-[#1878D1] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2
                    size={19}
                    className="animate-spin"
                  />
                  Processando...
                </>
              ) : (
                <>
                  <ShieldCheck size={19} />
                  Pagar {formatMoney(totalCost)}
                </>
              )}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-center text-[11px] text-[#666]">
              <ShieldCheck size={13} />
              Pagamento simulado para ambiente de demonstração
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
