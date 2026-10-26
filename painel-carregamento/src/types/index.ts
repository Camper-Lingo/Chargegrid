// src/types/index.ts

export interface Car {
  id: string;
  model: string;
  licensePlate: string;
  batteryCapacity: number; // kWh
  currentCharge: number; // %
  maxPower: number; // kW
  temperature?: number; // °C
  color?: string;
}

export interface Tariff {
  currentRate: number; // R$/kWh
  peakHours?: string[];
  offPeakRate?: number;
  peakRate?: number;
  lastUpdated: string;
}

export interface ChargeSession {
  id: string;
  timestamp: string;
  carId: string;
  carModel: string;
  licensePlate: string;
  startBattery: number; // %
  endBattery: number; // %
  energyUsed: number; // kWh
  costPerKwh: number;
  totalCost: number;
  duration: number; // minutos
  status: 'pending' | 'charging' | 'completed' | 'cancelled';
  stationId: string;
}

export interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
  createdAt: string;
}

export interface ChargeCalculation {
  energyNeeded: number;
  totalCostRaw: number;
  totalCostWithLoss: number;
  estimatedTime: number;
  powerAvailable: number;
  systemLoss: number;
}

export type Screen = 'dashboard' | 'select' | 'confirm' | 'charging' | 'history'| 'payment';

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}
