from pydantic import BaseModel
from datetime import datetime

class ChargeSessionCreate(BaseModel):
    customer_id: int
    vehicle_id: int
    station_id: int
    start_battery_pct: float
    end_battery_pct: float
    energy_used_kwh: float
    cost_per_kwh: float
    total_cost: float
    started_at: datetime
    ended_at: datetime
    duration_minutes: int
    status: str

class CustomerCreate(BaseModel):
    first_name: str
    last_name: str

class VehicleCreate(BaseModel):
    customer_id: int
    model: str
    battery_capacity_kwh: float
    current_battery_pct: float
    max_charge_power_kw: float

class ChargingCalculationRequest(BaseModel):
    energy_needed_kwh: float
    power_kw: float
    start_time: datetime
