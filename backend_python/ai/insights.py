from collections import defaultdict
from datetime import datetime


def generate_operational_insights(sessions, stations):
    """
    Gera insights operacionais a partir do histórico
    de sessões e do estado atual das estações.
    """

    total_sessions = len(sessions)

    completed_sessions = [
        session
        for session in sessions
        if session.get("status") == "completed"
    ]

    # -------------------------
    # Receita total
    # -------------------------

    total_revenue = sum(
        float(session.get("total_cost") or 0)
        for session in completed_sessions
    )

    # -------------------------
    # Energia total
    # -------------------------

    total_energy = sum(
        float(session.get("energy_used_kwh") or 0)
        for session in completed_sessions
    )

    # -------------------------
    # Horário de pico
    # -------------------------

    sessions_by_hour = defaultdict(int)

    for session in sessions:
        started_at = session.get("started_at")

        if not started_at:
            continue

        try:
            if isinstance(started_at, datetime):
                hour = started_at.hour
            else:
                hour = datetime.fromisoformat(
                    str(started_at).replace("Z", "+00:00")
                ).hour

            sessions_by_hour[hour] += 1

        except (ValueError, TypeError):
            continue

    peak_hour = None
    peak_hour_sessions = 0

    if sessions_by_hour:
        peak_hour = max(
            sessions_by_hour,
            key=sessions_by_hour.get
        )

        peak_hour_sessions = sessions_by_hour[peak_hour]

    # -------------------------
    # Estação mais utilizada
    # -------------------------

    station_usage = defaultdict(int)

    for session in sessions:
        station_id = session.get("station_id")

        if station_id is not None:
            station_usage[station_id] += 1

    critical_station = None

    if station_usage:
        critical_station_id = max(
            station_usage,
            key=station_usage.get
        )

        station = next(
            (
                station
                for station in stations
                if station.get("id") == critical_station_id
            ),
            None,
        )

        critical_station = {
            "id": critical_station_id,
            "name": (
                station.get("name")
                if station
                else f"Estação {critical_station_id}"
            ),
            "sessions": station_usage[critical_station_id],
        }

    # -------------------------
    # Ocupação atual
    # -------------------------

    occupied_stations = sum(
        1
        for station in stations
        if station.get("status") == "occupied"
    )

    total_stations = len(stations)

    occupancy_pct = (
        (occupied_stations / total_stations) * 100
        if total_stations > 0
        else 0
    )

    # -------------------------
    # Recomendações automáticas
    # -------------------------

    recommendations = []

    if occupancy_pct >= 75:
        recommendations.append(
            "Alta ocupação da rede. Considere redistribuir "
            "a demanda ou ampliar a capacidade disponível."
        )

    if peak_hour is not None:
        recommendations.append(
            f"Maior concentração histórica de recargas às "
            f"{peak_hour:02d}:00. Recomenda-se monitorar a "
            f"demanda nesse período."
        )

    if critical_station:
        recommendations.append(
            f"{critical_station['name']} apresenta a maior "
            f"utilização histórica e deve receber atenção operacional."
        )

    if not recommendations:
        recommendations.append(
            "Operação dentro dos padrões atuais. "
            "Nenhuma ação crítica identificada."
        )

    return {
        "summary": {
            "total_sessions": total_sessions,
            "completed_sessions": len(completed_sessions),
            "total_energy_kwh": round(total_energy, 2),
            "total_revenue": round(total_revenue, 2),
            "occupancy_pct": round(occupancy_pct, 1),
        },
        "peak": {
            "hour": peak_hour,
            "sessions": peak_hour_sessions,
        },
        "critical_station": critical_station,
        "recommendations": recommendations,
    }