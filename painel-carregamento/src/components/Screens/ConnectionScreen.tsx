import { useState } from 'react';
import {
  Link2,
  UserRound,
  Loader2,
  ArrowRight,
  Zap,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';

interface ConnectionScreenProps {
  onGuest: () => void;
  onConnect: (code: string) => Promise<void>;
}

export function ConnectionScreen({
  onGuest,
  onConnect,
}: ConnectionScreenProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleConnect() {
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setError('Digite seu código de conexão.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onConnect(cleanCode);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível conectar.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#1A1A1A] px-4 py-10">
      
      {/* Luzes de fundo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full blur-3xl"
          style={{
            background: '#00D084',
            opacity: 0.08,
          }}
        />

        <div
          className="absolute -bottom-40 -left-32 h-[450px] w-[450px] rounded-full blur-3xl"
          style={{
            background: '#1E90FF',
            opacity: 0.07,
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl flex-col justify-center">

        {/* Logo */}
        <div className="mb-9 text-center">
          <div className="mb-5 flex items-center justify-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center">
              <img
                src="/logo_goodwe.png"
                alt="GoodWe"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="text-left">
              <h1 className="text-3xl font-bold tracking-tight text-[#F5F5F5]">
                GoodWe
              </h1>

              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#00D084]">
                ChargeGrid
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[#F5F5F5] sm:text-3xl">
            Como deseja começar?
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#8E8E8E]">
            Conecte sua conta para carregar seus dados ou continue
            rapidamente como visitante.
          </p>
        </div>

        {/* Card principal */}
        <div className="grid gap-4 md:grid-cols-2">

          {/* CONECTAR COM O APP */}
          <div className="relative overflow-hidden rounded-2xl border border-[#00D084]/40 bg-[#242424] p-6 shadow-2xl transition duration-300 hover:border-[#00D084]/70">

            {/* Badge */}
            <div className="absolute right-4 top-4 rounded-full border border-[#00D084]/20 bg-[#00D084]/10 px-3 py-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00D084]">
                Recomendado
              </span>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#00D084]/20 bg-[#00D084]/10">
              <Smartphone
                size={22}
                className="text-[#00D084]"
              />
            </div>

            <div className="mt-5">
              <h3 className="text-lg font-bold text-[#F5F5F5]">
                Conectar com o app
              </h3>

              <p className="mt-1 min-h-[40px] text-sm leading-relaxed text-[#8E8E8E]">
                Use seu código ChargeGrid para acessar seu veículo e
                seus dados.
              </p>
            </div>

            <div className="mt-6">
              <label
                htmlFor="connection-code"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#777]"
              >
                Código de conexão
              </label>

              <div
                className={`flex items-center rounded-xl border bg-[#191919] px-4 transition ${
                  error
                    ? 'border-red-500/70'
                    : code
                      ? 'border-[#00D084]/60'
                      : 'border-[#3A3A3A] focus-within:border-[#00D084]'
                }`}
              >
                <Link2
                  size={17}
                  className="mr-3 shrink-0 text-[#666]"
                />

                <input
                  id="connection-code"
                  type="text"
                  value={code}
                  disabled={loading}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConnect();
                    }
                  }}
                  placeholder="CG-XXXXXX"
                  className="w-full bg-transparent py-3.5 font-mono text-base font-semibold uppercase tracking-wider text-[#F5F5F5] outline-none placeholder:text-[#4A4A4A] disabled:opacity-50"
                />
              </div>

              {error && (
                <p className="mt-2 text-xs text-red-400">
                  {error}
                </p>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={handleConnect}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00D084] px-4 py-3.5 font-bold text-[#101010] transition duration-200 hover:bg-[#00E891] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    Conectar
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* VISITANTE */}
          <div className="flex flex-col rounded-2xl border border-[#343434] bg-[#222222] p-6 shadow-xl transition duration-300 hover:border-[#4A4A4A] hover:bg-[#252525]">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#3A3A3A] bg-[#2C2C2C]">
              <UserRound
                size={22}
                className="text-[#B0B0B0]"
              />
            </div>

            <div className="mt-5">
              <h3 className="text-lg font-bold text-[#F5F5F5]">
                Continuar como visitante
              </h3>

              <p className="mt-1 text-sm leading-relaxed text-[#8E8E8E]">
                Configure seu veículo e inicie uma recarga sem
                precisar conectar uma conta.
              </p>
            </div>

            {/* Benefícios */}
            <div className="my-6 space-y-3">
              <div className="flex items-center gap-3 text-sm text-[#A0A0A0]">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2C2C2C]">
                  <Zap
                    size={14}
                    className="text-[#00D084]"
                  />
                </div>

                Configuração rápida
              </div>

              <div className="flex items-center gap-3 text-sm text-[#A0A0A0]">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2C2C2C]">
                  <ShieldCheck
                    size={14}
                    className="text-[#00D084]"
                  />
                </div>

                Não precisa de uma conta
              </div>
            </div>

            <button
              type="button"
              onClick={onGuest}
              className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl border border-[#444] bg-[#292929] px-4 py-3.5 font-semibold text-[#F5F5F5] transition duration-200 hover:border-[#666] hover:bg-[#303030]"
            >
              Continuar sem cadastro
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <div className="mt-7 flex items-center justify-center gap-2 text-xs text-[#5F5F5F]">
          <Zap
            size={13}
            className="text-[#00D084]"
          />

          <span>
            Estação de Carregamento GoodWe
          </span>

          <span className="text-[#333]">•</span>

          <span>ChargeGrid</span>
        </div>
      </div>
    </div>
  );
}