CREATE OR REPLACE FUNCTION public.get_partner_station_availability()
RETURNS TABLE (
  station_id UUID,
  station_name TEXT,
  station_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  availability_is_demo BOOLEAN,
  spot_id UUID,
  spot_label TEXT,
  connector_type TEXT,
  power_kw NUMERIC,
  operational_status TEXT,
  is_available BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.name,
    s.address,
    s.latitude,
    s.longitude,
    s.availability_is_demo,
    sp.id,
    sp.label,
    sp.connector_type,
    sp.power_kw,
    sp.operational_status,
    sp.operational_status = 'available' AND NOT EXISTS (
      SELECT 1
      FROM public.charging_reservations r
      WHERE r.spot_id = sp.id
        AND r.status = 'active'
        AND r.expires_at > NOW()
    )
  FROM public.charging_stations s
  JOIN public.charging_spots sp ON sp.station_id = s.id
  WHERE s.is_partner = TRUE
  ORDER BY s.name, sp.label;
$$;
REVOKE ALL ON FUNCTION public.get_partner_station_availability() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_partner_station_availability() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_station_availability() TO service_role;