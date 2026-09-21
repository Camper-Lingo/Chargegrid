// src/components/Screens/WelcomeScreen.tsx

import React, { useState } from 'react';
import { Car, Battery, Zap } from 'lucide-react';
import { Button } from '../Common/Button';

interface GuestVehicle {
  model: string;
  batteryCapacity: number;
  maxPower: number;
}

const VEHICLES: GuestVehicle[] = [
  {
    model: 'Tesla Model 3',
    batteryCapacity: 60,
    maxPower: 100,
  },
  {
    model: 'BYD Dolphin',
    batteryCapacity: 44.9,
    maxPower: 60,
  },
  {
    model: 'GWM Ora 03',
    batteryCapacity: 48,
    maxPower: 67,
  },
  {
    model: 'Volvo EX30',
    batteryCapacity: 69,
    maxPower: 153,
  },
  {
    model: 'Audi e-tron GT',
    batteryCapacity: 93.4,
    maxPower: 270,
  },
];

interface WelcomeScreenProps {
  onContinue: (
    model: string,
    batteryCapacity: number,
    maxPower: number,
    currentBattery: number
  ) => Promise<void>;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onContinue,
}) => {
  const [selectedModel, setSelectedModel] = useState('');
  const [currentBattery, setCurrentBattery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedVehicle = VEHICLES.find(
    (vehicle) => vehicle.model === selectedModel
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVehicle) {
      setError('Selecione seu veículo.');
      return;
    }

    if (currentBattery === '') {
      setError('Informe a bateria atual.');
      return;
    }

    const battery = Number(currentBattery);

    if (
      Number.isNaN(battery) ||
      battery < 0 ||
      battery > 100
    ) {
      setError('A bateria deve estar entre 0% e 100%.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onContinue(
        selectedVehicle.model,
        selectedVehicle.batteryCapacity,
        selectedVehicle.maxPower,
        battery
      );
    } catch (err) {
      console.error(err);
      setError('Não foi possível continuar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 right-20 w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{
            background: '#00D084',
            animation: 'blob 7s infinite',
          }}
        />

        <div
          className="absolute bottom-20 left-20 w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{
            background: '#1E90FF',
            animation: 'blob 7s infinite',
            animationDelay: '2s',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-12 h-12 flex items-center justify-center">
              <img
                src="/logo_goodwe.png"
                alt="GoodWe"
                className="w-full h-full object-contain"
              />
            </div>

            <h1 className="text-3xl font-bold text-[#F5F5F5]">
              GoodWe
            </h1>
          </div>

          <h2 className="text-2xl font-bold text-[#F5F5F5] mb-2">
            Configure seu veículo
          </h2>

          <p className="text-[#A0A0A0]">
            Precisamos de algumas informações para calcular sua recarga.
          </p>
        </div>

        {/* Card */}

        <div className="bg-[#2E2E2E] rounded-2xl border border-[#3A3A3A] p-7 shadow-2xl">
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Modelo */}

            <div>
              <label className="block text-sm text-[#A0A0A0] mb-2 font-medium">
                Modelo do veículo
              </label>

              <div className="flex items-center bg-[#242424] rounded-xl border-2 border-[#3A3A3A] focus-within:border-[#00D084] px-4">
                <Car
                  size={18}
                  className="text-[#6A6A6A] mr-3"
                />

                <select
                  value={selectedModel}
                  disabled={isLoading}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    setError('');
                  }}
                  className="flex-1 bg-[#242424] py-3 text-[#F5F5F5] outline-none"
                >
                  <option value="">
                    Selecione seu carro
                  </option>

                  {VEHICLES.map((vehicle) => (
                    <option
                      key={vehicle.model}
                      value={vehicle.model}
                    >
                      {vehicle.model}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Informações automáticas */}

            {selectedVehicle && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#242424] p-4">
                  <p className="text-xs text-[#A0A0A0]">
                    Capacidade
                  </p>

                  <p className="mt-1 font-bold text-[#F5F5F5]">
                    {selectedVehicle.batteryCapacity} kWh
                  </p>
                </div>

                <div className="rounded-xl bg-[#242424] p-4">
                  <p className="text-xs text-[#A0A0A0]">
                    Potência máxima
                  </p>

                  <p className="mt-1 font-bold text-[#F5F5F5]">
                    {selectedVehicle.maxPower} kW
                  </p>
                </div>
              </div>
            )}

            {/* Bateria */}

            <div>
              <label className="block text-sm text-[#A0A0A0] mb-2 font-medium">
                Bateria atual
              </label>

              <div className="flex items-center bg-[#242424] rounded-xl border-2 border-[#3A3A3A] focus-within:border-[#00D084] px-4">
                <Battery
                  size={18}
                  className="text-[#6A6A6A] mr-3"
                />

                <input
                  type="number"
                  min="0"
                  max="100"
                  value={currentBattery}
                  disabled={isLoading}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (value === '') {
                      setCurrentBattery('');
                      return;
                    }

                    const number = Math.min(
                      100,
                      Math.max(0, Number(value))
                    );

                    setCurrentBattery(String(number));
                    setError('');
                  }}
                  placeholder="Ex.: 35"
                  className="flex-1 bg-transparent py-3 text-[#F5F5F5] text-lg font-medium outline-none placeholder-[#4A4A4A]"
                />

                <span className="text-[#A0A0A0]">
                  %
                </span>
              </div>
            </div>

            {error && (
              <p className="text-[#FF6B35] text-sm">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              disabled={isLoading}
              icon={
                <Zap
                  size={18}
                  fill="white"
                />
              }
            >
              Continuar
            </Button>
          </form>

          <div className="mt-6 p-3 bg-[#1E90FF]/10 border border-[#1E90FF]/20 rounded-xl">
            <p className="text-[#1E90FF] text-xs text-center">
              Você está utilizando o modo visitante.
            </p>
          </div>
        </div>

        <p className="text-[#6A6A6A] text-sm text-center mt-6">
          Estação de Carregamento GoodWe ⚡
        </p>
      </div>
    </div>
  );
};