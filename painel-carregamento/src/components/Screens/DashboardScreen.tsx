// src/components/Screens/DashboardScreen.tsx

import React from 'react';
import {
  Zap,
  Battery,
  TrendingUp,
  Clock,
  Wifi,
  ChevronRight,
  Smartphone,
  CheckCircle2,
  Gauge,
  CarFront,
} from 'lucide-react';

import type { Car, Tariff } from '../../types';
import { Card } from '../Common/Card';
import { Button } from '../Common/Button';
import { CircularProgress } from '../Common/CircularProgress';
import { formatCurrency } from '../../utils/formatters';

interface DashboardScreenProps {
  car: Car | null;
  tariff: Tariff;
  onChargeClick: () => void;
  onHistoryClick: () => void;
  onConnectCar: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  car,
  tariff,
  onChargeClick,
  onHistoryClick,
  onConnectCar,
}) => {
  if (!car) {
    return (
      <div className="animate-[fade-in_0.4s_ease-out] space-y-4">
        <Card className="text-center py-12">
          <div className="w-20 h-20 bg-[#3A3A3A] rounded-full flex items-center justify-center mx-auto mb-4">
            <Battery size={40} className="text-[#6A6A6A]" />
          </div>

          <h2 className="text-xl font-bold text-[#F5F5F5] mb-2">
            Nenhum veículo conectado
          </h2>

          <p className="text-[#A0A0A0] text-sm mb-6">
            Conecte um veículo elétrico para começar o carregamento
          </p>

          <Button
            id="connect-car-btn"
            onClick={onConnectCar}
            size="lg"
          >
            <Zap size={18} />
            Conectar Veículo
          </Button>
        </Card>
      </div>
    );
  }

  const chargeKwh =
    (car.batteryCapacity * car.currentCharge) / 100;

  const batteryColor =
    car.currentCharge <= 20
      ? '#FF6B35'
      : car.currentCharge <= 50
        ? '#F5C542'
        : '#00D084';

  return (
    <div className="space-y-4 animate-[fade-in_0.4s_ease-out]">

      {/* APP SINCRONIZADO */}
      <div className="relative overflow-hidden rounded-2xl border border-[#00D084]/25 bg-gradient-to-r from-[#00D084]/10 to-[#1E90FF]/5 p-4">

        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#00D084]/10 blur-2xl" />

        <div className="relative flex items-center gap-3">

          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-[#00D084]/20 bg-[#00D084]/10">
            <Smartphone
              size={21}
              className="text-[#00D084]"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">

              <h3 className="text-sm font-bold text-[#F5F5F5]">
                Veículo sincronizado
              </h3>

              <CheckCircle2
                size={15}
                className="text-[#00D084]"
              />

            </div>

            <p className="mt-0.5 text-xs text-[#A0A0A0]">
              Dados carregados automaticamente pelo ChargeGrid
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-[#00D084]/20 bg-[#00D084]/10 px-3 py-1.5">

            <span className="h-1.5 w-1.5 rounded-full bg-[#00D084] animate-pulse" />

            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00D084]">
              Online
            </span>

          </div>

        </div>
      </div>


      {/* VEÍCULO */}
      <Card
        glow="blue"
        className="relative overflow-hidden"
      >

        {/* Decoração */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#1E90FF]/10 blur-3xl" />

        <div className="relative">

          {/* Cabeçalho */}
          <div className="mb-6 flex items-start justify-between gap-4">

            <div className="min-w-0">

              <div className="mb-3 flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E90FF]/10">
                  <CarFront
                    size={19}
                    className="text-[#1E90FF]"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">

                    <span className="h-2 w-2 rounded-full bg-[#00D084] animate-pulse" />

                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#00D084]">
                      Veículo ativo
                    </span>

                  </div>
                </div>

              </div>

              <h2 className="text-2xl font-bold leading-tight text-[#F5F5F5]">
                {car.model}
              </h2>

              {car.licensePlate && (
                <p className="mt-1 text-sm text-[#6A6A6A]">
                  {car.licensePlate}
                </p>
              )}

            </div>


            {/* Bateria circular */}
            <div className="flex-shrink-0">

              <CircularProgress
                percentage={car.currentCharge}
                size={115}
                strokeWidth={10}
                color={batteryColor}
              />

            </div>

          </div>


          {/* Barra de bateria */}
          <div className="mb-5 rounded-xl border border-[#343434] bg-[#202020] p-4">

            <div className="mb-3 flex items-center justify-between">

              <div className="flex items-center gap-2">

                <Battery
                  size={17}
                  style={{ color: batteryColor }}
                />

                <span className="text-sm text-[#A0A0A0]">
                  Estado da bateria
                </span>

              </div>

              <span
                className="text-sm font-bold"
                style={{ color: batteryColor }}
              >
                {car.currentCharge}%
              </span>

            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-[#343434]">

              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.min(
                    Math.max(car.currentCharge, 0),
                    100
                  )}%`,
                  backgroundColor: batteryColor,
                  boxShadow: `0 0 12px ${batteryColor}55`,
                }}
              />

            </div>

            <div className="mt-2 flex justify-between text-[10px] text-[#5F5F5F]">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>

          </div>


          {/* Informações do veículo */}
          <div className="grid grid-cols-3 gap-3">

            <StatBox
              icon={
                <Battery
                  size={16}
                  className="text-[#1E90FF]"
                />
              }
              label="Carga atual"
              value={`${chargeKwh.toFixed(1)} kWh`}
            />

            <StatBox
              icon={
                <Gauge
                  size={16}
                  className="text-[#A78BFA]"
                />
              }
              label="Capacidade"
              value={`${car.batteryCapacity} kWh`}
            />

            <StatBox
              icon={
                <Zap
                  size={16}
                  className="text-[#00D084]"
                />
              }
              label="Potência máx."
              value={`${car.maxPower} kW`}
            />

          </div>

        </div>

      </Card>


      {/* STATUS DA ESTAÇÃO */}
      <Card>

        <div className="mb-4 flex items-center">

          <div className="flex items-center gap-2">

            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E90FF]/10">
              <Wifi
                size={16}
                className="text-[#1E90FF]"
              />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#F5F5F5]">
                Estação de carregamento
              </h3>

              <p className="text-[10px] text-[#6A6A6A]">
                Informações em tempo real
              </p>
            </div>

          </div>


          <div className="ml-auto flex items-center gap-1.5 rounded-full bg-[#00D084]/10 px-2.5 py-1">

            <span className="h-1.5 w-1.5 rounded-full bg-[#00D084] animate-pulse" />

            <span className="text-[10px] font-semibold text-[#00D084]">
              Disponível
            </span>

          </div>

        </div>


        <div className="grid grid-cols-3 divide-x divide-[#343434]">

          <NetworkStat
            icon={
              <TrendingUp
                size={14}
                className="text-[#00D084]"
              />
            }
            label="Tarifa"
            value={`${formatCurrency(
              tariff.currentRate
            )}/kWh`}
            highlight
          />

          <NetworkStat
            icon={
              <Zap
                size={14}
                className="text-[#1E90FF]"
              />
            }
            label="Potência"
            value="450 kW"
          />

          <NetworkStat
            icon={
              <Clock
                size={14}
                className="text-[#A0A0A0]"
              />
            }
            label="Espera"
            value="0 min"
          />

        </div>

      </Card>


      {/* PRONTO PARA CARREGAR */}
      <div className="rounded-2xl border border-[#3A3A3A] bg-[#222222] p-4">

        <div className="mb-4 flex items-center justify-between">

          <div>
            <p className="text-xs text-[#6A6A6A]">
              Status
            </p>

            <div className="mt-1 flex items-center gap-2">

              <Zap
                size={17}
                className="text-[#00D084]"
                fill="#00D084"
              />

              <span className="font-semibold text-[#F5F5F5]">
                Pronto para carregar
              </span>

            </div>
          </div>

          <div className="rounded-lg bg-[#00D084]/10 px-3 py-2 text-right">

            <p className="text-[10px] text-[#6A6A6A]">
              Bateria
            </p>

            <p className="font-bold text-[#00D084]">
              {car.currentCharge}%
            </p>

          </div>

        </div>


        <Button
          id="start-charge-btn"
          variant="primary"
          size="lg"
          onClick={onChargeClick}
          fullWidth
          icon={
            <Zap
              size={18}
              fill="white"
            />
          }
        >
          Iniciar carregamento
        </Button>

      </div>


      {/* HISTÓRICO */}
      <Button
        id="history-btn"
        variant="secondary"
        size="lg"
        onClick={onHistoryClick}
        fullWidth
        icon={<ChevronRight size={16} />}
      >
        Ver histórico de carregamentos
      </Button>

    </div>
  );
};


const StatBox: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({
  icon,
  label,
  value,
}) => (
  <div className="rounded-xl border border-[#333333] bg-[#242424] p-3 transition-all duration-200 hover:border-[#444444] hover:bg-[#292929]">

    <div className="mb-2 flex items-center gap-1.5">
      {icon}

      <span className="text-[10px] text-[#808080]">
        {label}
      </span>
    </div>

    <div className="mono text-sm font-bold text-[#F5F5F5]">
      {value}
    </div>

  </div>
);


const NetworkStat: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}> = ({
  icon,
  label,
  value,
  highlight = false,
}) => (
  <div className="px-2 text-center">

    <div className="mb-1.5 flex items-center justify-center gap-1">
      {icon}

      <span className="text-[10px] text-[#6A6A6A]">
        {label}
      </span>
    </div>

    <div
      className={`mono text-sm font-bold ${
        highlight
          ? 'text-[#00D084]'
          : 'text-[#F5F5F5]'
      }`}
    >
      {value}
    </div>

  </div>
);