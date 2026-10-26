// src/utils/calculations.ts

import type { ChargeCalculation } from '../types';

export const calculateCharge = (
  currentBattery: number,
  targetBattery: number,
  batteryCapacity: number,
  costPerKwh: number,
  maxPower: number,
  systemLoss: number = 5
): ChargeCalculation => {
  const delta = targetBattery - currentBattery;
  console.log("===== DADOS DO CARREGAMENTO =====");
console.log("Bateria atual:", currentBattery);
console.log("Bateria alvo:", targetBattery);
console.log("Delta:", delta);
console.log("Capacidade bateria:", batteryCapacity);
console.log("Potência máxima:", maxPower);
  if (delta <= 0) {
    return {
      energyNeeded: 0,
      totalCostRaw: 0,
      totalCostWithLoss: 0,
      estimatedTime: 0,
      powerAvailable: Math.round(maxPower * 0.95),
      systemLoss,
    };
  }

  const energyNeeded = (batteryCapacity * delta) / 100;
  const losses = energyNeeded * (systemLoss / 100);
  const totalEnergy = energyNeeded + losses;
  console.log("Energia sem perdas:", energyNeeded);
console.log("Perdas:", losses);
console.log("Energia enviada API:", totalEnergy);
console.log("=================================");
  const totalCost = totalEnergy * costPerKwh;
  const estimatedTime = (totalEnergy / maxPower) * 60; // minutes

  return {
    energyNeeded: Math.round(totalEnergy * 10) / 10,
    totalCostRaw: Math.round(totalCost * 100) / 100,
    totalCostWithLoss: Math.round(totalCost * 100) / 100,
    estimatedTime: Math.max(1, Math.round(estimatedTime)),
    powerAvailable: Math.round(maxPower * 0.95),
    systemLoss,
  };
};
export const calculateChargeReal = async (
  currentBattery: number,
  targetBattery: number,
  batteryCapacity: number,
  maxPower: number,
  systemLoss: number = 5
): Promise<ChargeCalculation> => {
  const delta = targetBattery - currentBattery;
  console.log("===== DADOS DO CARREGAMENTO =====");
console.log("Bateria atual:", currentBattery);
console.log("Bateria alvo:", targetBattery);
console.log("Delta:", delta);
console.log("Capacidade bateria:", batteryCapacity);
console.log("Potência máxima:", maxPower);

  if (delta <= 0) {
    return {
      energyNeeded: 0,
      totalCostRaw: 0,
      totalCostWithLoss: 0,
      estimatedTime: 0,
      powerAvailable: Math.round(maxPower * 0.95),
      systemLoss,
    };
  }

  // Energia necessária para atingir a porcentagem desejada
  const energyNeeded = (batteryCapacity * delta) / 100;

  // Perdas do sistema
  const losses = energyNeeded * (systemLoss / 100);

  // Energia que realmente precisa ser fornecida
  const totalEnergy = energyNeeded + losses;

  // Chama o backend Python
  const response = await fetch(
    'http://localhost:8000/api/charging/calculate',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        energy_needed_kwh: totalEnergy,
        power_kw: maxPower,
        start_time: new Date().toISOString(),
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Erro ao calcular carregamento no servidor');
  }

  const data = await response.json();

  return {
    energyNeeded: data.energia_total_kwh,
    totalCostRaw: data.custo_total,
    totalCostWithLoss: data.custo_total,
    estimatedTime: Math.max(1, data.tempo_minutos),
    powerAvailable: Math.round(maxPower * 0.95),
    systemLoss,
  };
};
