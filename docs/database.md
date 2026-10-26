# ChargeGrid — Banco de Dados

## Tecnologia

O ChargeGrid utiliza PostgreSQL através do Supabase.

O banco armazena os dados utilizados pelas aplicações e pelo backend.

## Customers

Representa os clientes cadastrados.

Principais campos:

- id
- first_name
- last_name
- connection_code
- auth_user_id

## Vehicles

Representa os veículos cadastrados.

Principais campos:

- id
- customer_id
- model
- battery_capacity_kwh
- current_battery_pct
- max_charge_power_kw
- is_active

Cada veículo está associado a um cliente.

## Stations

Representa os pontos de carregamento.

Principais campos:

- id
- code
- name
- address
- latitude
- longitude
- max_power_kw
- status

Principais estados:

- available
- occupied

## Charge Sessions

Representa as sessões de carregamento.

Principais campos:

- id
- customer_id
- vehicle_id
- station_id
- start_battery_pct
- end_battery_pct
- energy_used_kwh
- cost_per_kwh
- total_cost
- started_at
- ended_at
- duration_minutes
- status

Principais status:

- completed
- cancelled

## Relacionamentos

Customer 1 → N Vehicles

Customer 1 → N Charge Sessions

Vehicle 1 → N Charge Sessions

Station 1 → N Charge Sessions

## Fluxo de acesso aos dados

Frontend
↓
FastAPI
↓
PostgreSQL / Supabase

O backend centraliza as principais regras de negócio e o acesso operacional aos dados.