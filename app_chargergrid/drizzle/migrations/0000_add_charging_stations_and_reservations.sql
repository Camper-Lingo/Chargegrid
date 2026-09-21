CREATE TABLE public.charging_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_partner BOOLEAN NOT NULL DEFAULT FALSE,
  availability_is_demo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT ON public.charging_stations TO authenticated;
GRANT ALL ON public.charging_stations TO service_role;
ALTER TABLE public.charging_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view charging stations"
ON public.charging_stations FOR SELECT TO authenticated USING (TRUE);

CREATE TABLE public.charging_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.charging_stations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  connector_type TEXT NOT NULL DEFAULT 'CCS2',
  power_kw NUMERIC NOT NULL DEFAULT 60 CHECK (power_kw > 0),
  operational_status TEXT NOT NULL DEFAULT 'available' CHECK (operational_status IN ('available', 'occupied', 'offline')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (station_id, label)
);
GRANT SELECT ON public.charging_spots TO authenticated;
GRANT ALL ON public.charging_spots TO service_role;
ALTER TABLE public.charging_spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view charging spots"
ON public.charging_spots FOR SELECT TO authenticated USING (TRUE);

CREATE TABLE public.charging_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spot_id UUID NOT NULL REFERENCES public.charging_spots(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'completed')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '20 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at > starts_at)
);
CREATE INDEX charging_reservations_user_status_idx ON public.charging_reservations(user_id, status);
CREATE INDEX charging_reservations_spot_status_idx ON public.charging_reservations(spot_id, status);
GRANT SELECT, UPDATE ON public.charging_reservations TO authenticated;
GRANT ALL ON public.charging_reservations TO service_role;
ALTER TABLE public.charging_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own charging reservations"
ON public.charging_reservations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can cancel their own active charging reservations"
ON public.charging_reservations FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status = 'active')
WITH CHECK (auth.uid() = user_id AND status IN ('active', 'cancelled'));

CREATE OR REPLACE FUNCTION public.reserve_charging_spot(_spot_id UUID)
RETURNS public.charging_reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _reservation public.charging_reservations;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_spot_id::text));

  UPDATE public.charging_reservations
  SET status = 'expired'
  WHERE status = 'active' AND expires_at <= NOW();

  IF EXISTS (
    SELECT 1 FROM public.charging_reservations
    WHERE user_id = _user_id AND status = 'active' AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'Você já possui uma reserva ativa';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.charging_spots
    WHERE id = _spot_id AND operational_status = 'available'
  ) THEN
    RAISE EXCEPTION 'Esta vaga não está disponível';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.charging_reservations
    WHERE spot_id = _spot_id AND status = 'active' AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'Esta vaga acabou de ser reservada';
  END IF;

  INSERT INTO public.charging_reservations (user_id, spot_id)
  VALUES (_user_id, _spot_id)
  RETURNING * INTO _reservation;

  RETURN _reservation;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_charging_spot(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_charging_spot(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_charging_spot(UUID) TO service_role;