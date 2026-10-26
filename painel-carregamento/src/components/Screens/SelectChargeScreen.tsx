// src/components/Screens/SelectChargeScreen.tsx

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Zap, Battery, Clock, DollarSign } from 'lucide-react';
import type { Car, Tariff, ChargeCalculation } from '../../types';
import { Card } from '../Common/Card';
import { Button } from '../Common/Button';
import { calculateChargeReal } from '../../utils/calculations';
import { formatCurrency, formatTime, formatEnergy } from '../../utils/formatters';

interface SelectChargeScreenProps {
  car: Car;
  tariff: Tariff;
  onBack: () => void;
  onContinue: (targetBattery: number, calc: ChargeCalculation) => void;
}

const QUICK_OPTIONS = [
  { label: '+10%', delta: 10 },
  { label: '+20%', delta: 20 },
  { label: '+30%', delta: 30 },
  { label: '+40%', delta: 40 },
  { label: '100%', target: 100 },
];

export const SelectChargeScreen: React.FC<SelectChargeScreenProps> = ({
  car,
  onBack,
  onContinue,
}) => {
  const minBattery = car.currentCharge;
  const [target, setTarget] = useState(Math.min(100, minBattery + 20));
  const [customInput, setCustomInput] = useState('');
  const [inputError, setInputError] = useState('');

const [calculation, setCalculation] = useState<ChargeCalculation>({
  energyNeeded: 0,
  totalCostRaw: 0,
  totalCostWithLoss: 0,
  estimatedTime: 0,
  powerAvailable: Math.round(car.maxPower * 0.95),
  systemLoss: 5,
});

const [, setIsCalculating] = useState(false);

useEffect(() => {
  const calculate = async () => {
    const delta = target - car.currentCharge;

    if (delta <= 0) {
      return;
    }

    setIsCalculating(true);

    try {
      const result = await calculateChargeReal(
        car.currentCharge,
        target,
        car.batteryCapacity,
        car.maxPower
      );

      setCalculation(result);
    } catch (error) {
      console.error('Erro ao calcular carregamento:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  calculate();
}, [target, car.currentCharge, car.batteryCapacity, car.maxPower]);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setTarget(val);
    setCustomInput('');
    setInputError('');
  };

  const handleQuick = (delta?: number, absoluteTarget?: number) => {
    const newTarget = absoluteTarget !== undefined
      ? absoluteTarget
      : Math.min(100, minBattery + (delta ?? 0));
    setTarget(newTarget);
    setCustomInput('');
    setInputError('');
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setCustomInput(raw);
    const val = Number(raw);
    if (raw === '') {
      setInputError('');
      return;
    }
    if (isNaN(val) || val < minBattery || val > 100) {
      setInputError(`Entre ${minBattery}% e 100%`);
    } else {
      setInputError('');
      setTarget(val);
    }
  };

  const delta = target - minBattery;
  const isValid = delta > 0 && !inputError;


  return (
    <div className="space-y-4 animate-[fade-in_0.4s_ease-out]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          id="back-to-dashboard"
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-[#2E2E2E] border border-[#3A3A3A] flex items-center justify-center text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-[#3A3A3A] transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="font-bold text-[#F5F5F5] text-lg">Quanto deseja carregar?</h2>
          <p className="text-[#A0A0A0] text-sm">{car.model} · {car.currentCharge}% atual</p>
        </div>
      </div>

      {/* Battery visual */}
      <Card glow="blue" className="pb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Battery size={16} className="text-[#1E90FF]" />
            <span className="text-sm text-[#A0A0A0]">Nível de carregamento</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="mono text-sm text-[#A0A0A0]">{minBattery}%</span>
            <span className="text-[#3A3A3A]">→</span>
            <span className="mono text-lg font-bold text-[#1E90FF]">{target}%</span>
          </div>
        </div>

        {/* Custom track */}
        <div className="relative mb-4">
          {/* Base track */}
          <div className="h-3 bg-[#3A3A3A] rounded-full overflow-hidden">
            {/* Already charged (fixed) */}
            <div
              className="absolute h-3 bg-[#2E2E2E] rounded-full"
              style={{ width: `${minBattery}%`, background: '#1E90FF33' }}
            />
            {/* New charge fill */}
            <div
              className="absolute h-3 bg-gradient-to-r from-[#1E90FF] to-[#00D084] rounded-full transition-all duration-100"
              style={{
                left: `${minBattery}%`,
                width: `${Math.max(0, target - minBattery)}%`,
              }}
            />
          </div>
          {/* Slider */}
          <input
            id="charge-slider"
            type="range"
            min={minBattery}
            max={100}
            value={target}
            onChange={handleSlider}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
            style={{ height: '12px' }}
          />
          {/* Thumb indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full border-2 border-[#1E90FF] shadow-lg pointer-events-none transition-all duration-100"
            style={{ left: `calc(${target}% - 10px)` }}
          />
        </div>

        {/* Tick marks */}
        <div className="flex justify-between text-xs text-[#6A6A6A] mono px-1">
          {[0, 25, 50, 75, 100].map((tick) => (
            <span key={tick}>{tick}%</span>
          ))}
        </div>
      </Card>

      {/* Quick select */}
      <div>
        <p className="text-xs text-[#A0A0A0] uppercase tracking-wider mb-2 px-1">
          Opções rápidas
        </p>
        <div className="grid grid-cols-5 gap-2">
          {QUICK_OPTIONS.map((opt) => {
            const optTarget = opt.target !== undefined
              ? opt.target
              : Math.min(100, minBattery + opt.delta!);
            const isActive = target === optTarget;
            return (
              <button
                key={opt.label}
                id={`quick-${opt.label}`}
                onClick={() => handleQuick(opt.delta, opt.target)}
                className={`py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border
                  ${isActive
                    ? 'bg-[#1E90FF] text-white border-[#1E90FF] shadow-lg shadow-blue-500/30'
                    : 'bg-[#2E2E2E] text-[#A0A0A0] border-[#3A3A3A] hover:bg-[#3A3A3A] hover:text-[#F5F5F5]'
                  }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom input */}
      <Card>
        <label htmlFor="custom-percent" className="block text-sm text-[#A0A0A0] mb-2">
          Percentual personalizado
        </label>
        <div className="flex items-center gap-3">
          <div className={`flex-1 flex items-center bg-[#242424] rounded-xl border px-4 py-3 transition-colors
            ${inputError ? 'border-[#FF6B35]' : 'border-[#3A3A3A] focus-within:border-[#1E90FF]'}`}
          >
            <input
              id="custom-percent"
              type="number"
              min={minBattery + 1}
              max={100}
              value={customInput}
              onChange={handleCustomInput}
              placeholder={`${minBattery + 1} – 100`}
              className="flex-1 bg-transparent text-[#F5F5F5] mono font-bold text-lg outline-none placeholder-[#4A4A4A] w-full"
            />
            <span className="text-[#A0A0A0] font-bold">%</span>
          </div>
        </div>
        {inputError && (
          <p className="text-xs text-[#FF6B35] mt-1.5">{inputError}</p>
        )}
      </Card>

      {/* Live calculation preview */}
      <Card glow={isValid ? 'green' : 'none'} className="transition-all duration-300">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-[#00D084]" />
          <span className="text-sm font-semibold text-[#F5F5F5]">Estimativa</span>
          {delta > 0 && (
            <span className="ml-auto text-xs bg-[#00D084]/20 text-[#00D084] px-2 py-0.5 rounded-full font-medium">
              +{delta}%
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <CalcStat
            icon={<Battery size={14} className="text-[#1E90FF]" />}
            label="Energia"
            value={isValid ? formatEnergy(calculation.energyNeeded) : '—'}
          />
          <CalcStat
            icon={<Clock size={14} className="text-[#A0A0A0]" />}
            label="Tempo est."
            value={isValid ? formatTime(calculation.estimatedTime) : '—'}
          />
          <CalcStat
            icon={<DollarSign size={14} className="text-[#00D084]" />}
            label="Custo est."
            value={isValid ? formatCurrency(calculation.totalCostRaw) : '—'}
            highlight
          />
        </div>
      </Card>

      {/* Continue */}
      <Button
        id="continue-btn"
        variant="primary"
        size="lg"
        fullWidth
        disabled={!isValid}
        onClick={() => onContinue(target, calculation)}
        icon={<Zap size={18} fill="white" />}
      >
        Continuar
      </Button>
    </div>
  );
};

const CalcStat: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}> = ({ icon, label, value, highlight = false }) => (
  <div className="text-center">
    <div className="flex items-center justify-center gap-1 mb-1">
      {icon}
      <span className="text-xs text-[#6A6A6A]">{label}</span>
    </div>
    <div className={`mono font-bold text-sm ${highlight ? 'text-[#00D084]' : 'text-[#F5F5F5]'}`}>
      {value}
    </div>
  </div>
);
