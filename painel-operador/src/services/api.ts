import type { DashboardData, DemandData } from "../types";

const API_URL = "http://localhost:8000";

const TOKEN_KEY = "chargegrid_admin_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export async function login(password: string) {
  const response = await fetch(`${API_URL}/api/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      password,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    throw new Error(
      data?.detail ?? "Senha inválida"
    );
  }

  const data = await response.json();

  setToken(data.token);

  return data;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,

    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
  logout();

  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }

  throw new Error("Sessão expirada");
}

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    throw new Error(
      data?.detail ?? "Erro ao comunicar com o servidor"
    );
  }

  return response.json();
}

export async function getDashboard(
  period: "today" | "7d" | "30d" = "today"
): Promise<DashboardData> {
  return apiRequest<DashboardData>(
    `/api/admin/dashboard?period=${period}`
  );
}
export async function getDemand(): Promise<DemandData> {
  return apiRequest<DemandData>(
    "/api/demand"
  );
}

export async function updateDemandConfig(
  installationLimit: number,
  buildingConsumption: number
): Promise<void> {
  await apiRequest(
    `/api/demand/config?installation_limit_kw=${installationLimit}&building_consumption_kw=${buildingConsumption}`,
    {
      method: "PUT",
    }
  );
}
export interface IntelligenceData {
  summary: {
    total_sessions: number;
    completed_sessions: number;
    total_energy_kwh: number;
    total_revenue: number;
    occupancy_pct: number;
  };

  peak: {
    hour: number | null;
    sessions: number;
  };

  critical_station: {
    id: number;
    name: string;
    sessions: number;
  } | null;

  recommendations: string[];
}

export async function getIntelligence(): Promise<IntelligenceData> {
  return apiRequest<IntelligenceData>("/api/admin/insights");
}


export type PaymentMethod = 'pix' | 'card' | 'wallet';

export interface FinanceData {
  summary: {
    total_revenue: number;
    approved_payments: number;
    pending_payments: number;
    failed_payments: number;
  };

  methods: {
    method: PaymentMethod;
    payments: number;
    revenue: number;
  }[];


  wallet: {
    total_topups: number;
    total_topup_bonus: number;
    total_cashback: number;
    paid_balance: number;
    bonus_balance: number;
  };


  recent_payments: {
    id: number;
    session_id: number;
    customer_id: number;
    amount: number;
    payment_method: PaymentMethod;
    status: 'pending' | 'approved' | 'failed';
    created_at: string;
    paid_at: string | null;
  }[];
}

export async function getFinance(): Promise<FinanceData> {
  return apiRequest<FinanceData>('/api/admin/finance');
}
