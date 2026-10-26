export interface KpiValue {
  value: number;
  previous?: number;
  change_pct?: number | null;
}

export interface DashboardSeries {
  label: string;
  timestamp: string;
  sessions: number;
  energy_kwh: number;
  revenue: number;
}

export interface StationUsage {
  station_code: string;
  sessions: number;
  energy_kwh: number;
  revenue: number;
}

export interface DashboardSession {
  id: number;
  first_name: string;
  last_name: string;
  model: string;
  station_code: string;
  start_battery_pct: number;
  end_battery_pct: number;
  energy_used_kwh: number;
  cost_per_kwh: number;
  total_cost: number;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  status: string;
}

export interface DashboardData {
  period: "today" | "7d" | "30d";

  range: {
    start: string;
    end: string;
  };

  generated_at: string;

  kpis: {
    sessions: KpiValue;
    energy_kwh: KpiValue;
    revenue: KpiValue;
    active_users: KpiValue;
    avg_duration_min: KpiValue;
    cancelled: {
      value: number;
    };
  };

  series: DashboardSeries[];
  peak_hour: number | null;
  by_station: StationUsage[];
  station_status: Record<string, number>;
  sessions: DashboardSession[];
}

export interface DemandData {
  installation_limit_kw: number;
  building_consumption_kw: number;
  available_for_evs_kw: number;
  ev_requested_kw: number;
  ev_allowed_kw: number;
  total_requested_kw: number;
  projected_total_kw: number;
  utilization_pct: number;
  limited: boolean;
  reduction_kw: number;
  reduction_pct: number;
}