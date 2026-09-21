// src/services/apiClient.ts

const API_URL = 'http://localhost:8000';

export interface ApiStation {
  id: number;
  code: string;
  max_power_kw: number;
  status: string;
}

export const createCustomer = async (
  firstName: string,
  lastName: string
): Promise<{ customer_id: number }> => {
  const response = await fetch(`${API_URL}/api/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ first_name: firstName, last_name: lastName }),
  });
  if (!response.ok) throw new Error('Falha ao criar cliente');
  return response.json();
};

export const createVehicle = async (vehicle: {
  customer_id: number;
  model: string;
  battery_capacity_kwh: number;
  current_battery_pct: number;
  max_charge_power_kw: number;
}): Promise<{ vehicle_id: number }> => {
  const response = await fetch(`${API_URL}/api/vehicles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(vehicle),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail ?? 'Falha ao criar veículo'
    );
  }

  return response.json();
};

export const getStations = async (): Promise<ApiStation[]> => {
  const response = await fetch(`${API_URL}/api/stations`);
  if (!response.ok) throw new Error('Falha ao buscar estações');
  return response.json();
};

export const saveChargeSession = async (session: {
  customer_id: number;
  vehicle_id: number;
  station_id: number;
  start_battery_pct: number;
  end_battery_pct: number;
  energy_used_kwh: number;
  cost_per_kwh: number;
  total_cost: number;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  status: string;
}): Promise<{ session_id: number }> => {
  const response = await fetch(`${API_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  });
  if (!response.ok) throw new Error('Falha ao salvar sessão');
  return response.json();
};

export async function calculateCharging(
  budget: number,
  powerKw: number,
  startTime: string
) {
  const response = await fetch(
    'http://localhost:8000/api/charging/calculate',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        budget,
        power_kw: powerKw,
        start_time: startTime,
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Erro ao calcular carregamento');
  }

  return response.json();
}
export interface AdminCustomer {
  id: number;
  first_name: string;
  last_name: string;
}

export interface AdminVehicle {
  id: number;
  customer_id: number;
  model: string;
  plate: string;
  battery_capacity_kwh: number;
  max_power_kw: number;
}

export interface AdminSession {
  id: number;
  first_name: string;
  last_name: string;
  model: string;
  plate: string;
  station_code: string;
  start_battery_pct: number;
  end_battery_pct: number;
  energy_used_kwh: number;
  cost_per_kwh: number;
  total_cost: number;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  status: string;
}

export const getAdminCustomers = async (): Promise<AdminCustomer[]> => {
  const response = await fetch(`${API_URL}/api/admin/customers`);

  if (!response.ok) {
    throw new Error('Falha ao buscar clientes');
  }

  return response.json();
};

export const getAdminVehicles = async (): Promise<AdminVehicle[]> => {
  const response = await fetch(`${API_URL}/api/admin/vehicles`);

  if (!response.ok) {
    throw new Error('Falha ao buscar veículos');
  }

  return response.json();
};

export const getAdminSessions = async (): Promise<AdminSession[]> => {
  const response = await fetch(`${API_URL}/api/admin/sessions`);

  if (!response.ok) {
    throw new Error('Falha ao buscar sessões');
  }

  return response.json();
};
export interface ConnectedVehicle {
  id: number;
  customer_id: number;
  model: string;
  battery_capacity_kwh: number;
  current_battery_pct: number;
  max_charge_power_kw: number | null;
}

export interface ConnectionResult {
  customer_id: number;
  first_name: string;
  last_name: string;
  vehicle: ConnectedVehicle;
}

export const connectByCode = async (
  code: string
): Promise<ConnectionResult> => {
  const cleanCode = code.trim().toUpperCase();

  const response = await fetch(
    `${API_URL}/api/connect/${encodeURIComponent(cleanCode)}`
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail ?? "Não foi possível conectar com o app"
    );
  }

  return response.json();
};