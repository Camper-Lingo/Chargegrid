-- Perfis de usuário
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id);

-- Cria perfil automaticamente no cadastro
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Veículos do usuário
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  battery_capacity_kwh numeric not null check (battery_capacity_kwh > 0),
  max_charge_power_kw numeric not null check (max_charge_power_kw > 0),
  current_battery_pct numeric not null default 50 check (current_battery_pct >= 0 and current_battery_pct <= 100),
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.vehicles to authenticated;
grant all on public.vehicles to service_role;

alter table public.vehicles enable row level security;

create policy "Users manage own vehicles"
  on public.vehicles for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Faixas de tarifa por horário (leitura pública)
create table public.tariff_periods (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  starts_at time not null,
  ends_at time not null,
  price_per_kwh numeric not null check (price_per_kwh > 0)
);

grant select on public.tariff_periods to anon;
grant select on public.tariff_periods to authenticated;
grant all on public.tariff_periods to service_role;

alter table public.tariff_periods enable row level security;

create policy "Anyone can read tariffs"
  on public.tariff_periods for select to anon, authenticated
  using (true);

-- Tarifas de exemplo (R$/kWh)
insert into public.tariff_periods (label, starts_at, ends_at, price_per_kwh) values
  ('Fora de ponta', '00:00', '17:00', 0.65),
  ('Intermediária', '17:00', '18:00', 0.95),
  ('Ponta', '18:00', '21:00', 1.45),
  ('Intermediária', '21:00', '22:00', 0.95),
  ('Fora de ponta', '22:00', '24:00', 0.65);

-- Sessões de recarga
create table public.charging_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  target_pct numeric not null check (target_pct > 0 and target_pct <= 100),
  start_pct numeric not null check (start_pct >= 0 and start_pct < 100),
  energy_kwh numeric not null check (energy_kwh >= 0),
  price_per_kwh numeric not null,
  total_cost numeric not null,
  status text not null default 'completed' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.charging_sessions to authenticated;
grant all on public.charging_sessions to service_role;

alter table public.charging_sessions enable row level security;

create policy "Users manage own sessions"
  on public.charging_sessions for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);